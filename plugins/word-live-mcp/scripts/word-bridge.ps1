param(
    [Parameter(Mandatory = $true)]
    [string]$PayloadBase64
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function Write-BridgeResult {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Value
    )

    $json = $Value | ConvertTo-Json -Depth 8 -Compress
    [Console]::Out.Write($json)
}

function Normalize-WordText {
    param(
        [AllowNull()]
        [object]$Text
    )

    if ($null -eq $Text) {
        return ""
    }

    $value = [string]$Text
    $value = $value -replace "`r", ""
    $value = $value -replace "`a", ""
    return $value.TrimEnd("`n")
}

function Get-WordApplication {
    param(
        [bool]$CreateIfMissing = $false,
        [bool]$Visible = $true
    )

    try {
        $app = [Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
        if ($null -ne $app) {
            return $app
        }
    } catch {
    }

    if (-not $CreateIfMissing) {
        return $null
    }

    $created = New-Object -ComObject Word.Application
    $created.Visible = $Visible
    return $created
}

function Require-ActiveDocument {
    param(
        [Parameter(Mandatory = $true)]
        $App
    )

    $doc = $App.ActiveDocument
    if ($null -eq $doc) {
        throw "Microsoft Word is running but there is no active document."
    }
    return $doc
}

function Get-SelectionSnapshot {
    param(
        [Parameter(Mandatory = $true)]
        $App
    )

    $selection = $App.Selection
    if ($null -eq $selection) {
        return @{
            text = ""
            start = $null
            end = $null
            isEmpty = $true
        }
    }

    $text = Normalize-WordText $selection.Range.Text
    return @{
        text = $text
        start = [int]$selection.Range.Start
        end = [int]$selection.Range.End
        isEmpty = [string]::IsNullOrEmpty($text)
    }
}

function Replace-SelectionSafely {
    param(
        [Parameter(Mandatory = $true)]
        $Selection,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Text
    )

    $range = $Selection.Range
    $start = [int]$range.Start
    $end = [int]$range.End
    $documentRange = $range.Document.Range($start, $end)
    $documentRange.Text = $Text
    $Selection.SetRange($start, $start + $Text.Length)
    return $documentRange
}

function Insert-TextAfterSelection {
    param(
        [Parameter(Mandatory = $true)]
        $Selection,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Text
    )

    $range = $Selection.Range
    $insertAt = [int]$range.End
    $documentRange = $range.Document.Range($insertAt, $insertAt)
    $documentRange.Text = $Text
    $Selection.SetRange($range.Start, $range.End)
    return $documentRange
}

try {
    $jsonPayload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PayloadBase64))
    $payload = $jsonPayload | ConvertFrom-Json
    $action = [string]$payload.action
    $args = $payload.args

    switch ($action) {
        "status" {
            $app = Get-WordApplication
            if ($null -eq $app) {
                Write-BridgeResult @{
                    ok = $false
                    error = "Microsoft Word is not running. Open Word and a document first, or call word_open_document."
                }
                break
            }

            $doc = Require-ActiveDocument -App $app
            $selection = Get-SelectionSnapshot -App $app

            Write-BridgeResult @{
                ok = $true
                visible = [bool]$app.Visible
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                    saved = [bool]$doc.Saved
                    trackRevisions = [bool]$doc.TrackRevisions
                    paragraphCount = [int]$doc.Paragraphs.Count
                }
                selection = $selection
            }
            break
        }
        "open_document" {
            $targetPath = [string]$args.path
            if ([string]::IsNullOrWhiteSpace($targetPath)) {
                throw "The 'path' argument is required."
            }
            if (-not (Test-Path -LiteralPath $targetPath)) {
                throw "File not found: $targetPath"
            }

            $visible = $true
            if ($null -ne $args.visible) {
                $visible = [bool]$args.visible
            }

            $app = Get-WordApplication -CreateIfMissing $true -Visible $visible
            $app.Visible = $visible
            $doc = $app.Documents.Open($targetPath)

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                visible = [bool]$app.Visible
            }
            break
        }
        "get_selection" {
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $selection = Get-SelectionSnapshot -App $app

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                selection = $selection
            }
            break
        }
        "replace_selection" {
            $replacement = [string]$args.text
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $selection = $app.Selection
            if ($null -eq $selection) {
                throw "There is no active selection."
            }
            $before = Normalize-WordText $selection.Range.Text
            if ([string]::IsNullOrEmpty($before)) {
                throw "The current selection is empty. Select the target text in Word or use word_insert_text_at_selection."
            }

            $updatedRange = Replace-SelectionSafely -Selection $selection -Text $replacement
            $after = Normalize-WordText $updatedRange.Text

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                before = $before
                after = $after
            }
            break
        }
        "delete_selection" {
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $selection = $app.Selection
            if ($null -eq $selection) {
                throw "There is no active selection."
            }
            $before = Normalize-WordText $selection.Range.Text
            if ([string]::IsNullOrEmpty($before)) {
                throw "The current selection is empty. Select the target text in Word first."
            }

            $updatedRange = Replace-SelectionSafely -Selection $selection -Text ""

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                before = $before
                after = Normalize-WordText $updatedRange.Text
                deleted = $true
            }
            break
        }
        "insert_text_at_selection" {
            $text = [string]$args.text
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $selection = $app.Selection
            if ($null -eq $selection) {
                throw "There is no active selection."
            }

            $updatedRange = Replace-SelectionSafely -Selection $selection -Text $text

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                inserted = Normalize-WordText $updatedRange.Text
            }
            break
        }
        "insert_text_after_selection" {
            $text = [string]$args.text
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $selection = $app.Selection
            if ($null -eq $selection) {
                throw "There is no active selection."
            }

            $before = Normalize-WordText $selection.Range.Text
            $insertedRange = Insert-TextAfterSelection -Selection $selection -Text $text

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                before = $before
                inserted = Normalize-WordText $insertedRange.Text
            }
            break
        }
        "list_paragraphs" {
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app

            $start = 1
            if ($null -ne $args.start) {
                $start = [int]$args.start
            }
            $count = 20
            if ($null -ne $args.count) {
                $count = [int]$args.count
            }

            if ($start -lt 1) {
                throw "The 'start' argument must be >= 1."
            }
            if ($count -lt 1 -or $count -gt 100) {
                throw "The 'count' argument must be between 1 and 100."
            }

            $paragraphCount = [int]$doc.Paragraphs.Count
            $end = [Math]::Min($paragraphCount, $start + $count - 1)
            $items = @()

            for ($i = $start; $i -le $end; $i++) {
                $paragraph = $doc.Paragraphs.Item($i)
                $items += @{
                    index = $i
                    text = Normalize-WordText $paragraph.Range.Text
                }
            }

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                    paragraphCount = $paragraphCount
                }
                start = $start
                count = $items.Count
                paragraphs = $items
            }
            break
        }
        "replace_paragraph" {
            $index = [int]$args.index
            $text = [string]$args.text

            if ($index -lt 1) {
                throw "The 'index' argument must be >= 1."
            }

            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $paragraphCount = [int]$doc.Paragraphs.Count

            if ($index -gt $paragraphCount) {
                throw "Paragraph index $index exceeds paragraph count $paragraphCount."
            }

            $paragraph = $doc.Paragraphs.Item($index)
            $before = Normalize-WordText $paragraph.Range.Text
            $paragraph.Range.Text = $text + "`r"
            $after = Normalize-WordText $paragraph.Range.Text

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                index = $index
                before = $before
                after = $after
            }
            break
        }
        "set_track_revisions" {
            $enabled = [bool]$args.enabled
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $doc.TrackRevisions = $enabled

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                    trackRevisions = [bool]$doc.TrackRevisions
                }
            }
            break
        }
        "add_comment_on_selection" {
            $commentText = [string]$args.text
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $selection = $app.Selection
            if ($null -eq $selection) {
                throw "There is no active selection."
            }
            $range = $selection.Range
            if ([string]::IsNullOrWhiteSpace((Normalize-WordText $range.Text))) {
                throw "The current selection is empty. Select text before adding a comment."
            }

            $comment = $doc.Comments.Add($range, $commentText)

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                }
                comment = @{
                    author = [string]$comment.Author
                    text = Normalize-WordText $comment.Range.Text
                }
            }
            break
        }
        "save_document" {
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app

            if ($null -ne $args.path -and -not [string]::IsNullOrWhiteSpace([string]$args.path)) {
                $doc.SaveAs([string]$args.path)
            } else {
                $doc.Save()
            }

            Write-BridgeResult @{
                ok = $true
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                    saved = [bool]$doc.Saved
                }
            }
            break
        }
        "undo_last_action" {
            $app = Get-WordApplication
            if ($null -eq $app) {
                throw "Microsoft Word is not running."
            }
            $doc = Require-ActiveDocument -App $app
            $undone = $doc.Undo(1)

            Write-BridgeResult @{
                ok = [bool]$undone
                document = @{
                    name = [string]$doc.Name
                    path = [string]$doc.FullName
                    saved = [bool]$doc.Saved
                }
            }
            break
        }
        default {
            throw "Unsupported action: $action"
        }
    }
} catch {
    Write-BridgeResult @{
        ok = $false
        error = $_.Exception.Message
    }
}
