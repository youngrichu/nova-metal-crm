Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

' Check if already running on port 5173
Dim sTmp
sTmp = oShell.ExpandEnvironmentStrings("%TEMP%") & "\nova_check.txt"
oShell.Run "cmd /c netstat -ano | findstr :5173 > """ & sTmp & """", 0, True

Dim bRunning
bRunning = False
If oFSO.FileExists(sTmp) Then
    Dim oFile
    Set oFile = oFSO.OpenTextFile(sTmp, 1)
    If Not oFile.AtEndOfStream Then
        bRunning = Len(Trim(oFile.ReadAll())) > 0
    End If
    oFile.Close
    oFSO.DeleteFile sTmp
End If

If bRunning Then
    oShell.Run "http://localhost:5173"
Else
    ' Start server minimized (style 2 = SW_SHOWMINIMIZED)
    oShell.Run "cmd /k D:\nova-metal-crm\nova-server.bat", 2, False

    ' Poll /login until SvelteKit is fully ready
    ' "sveltekit-preload-data" only appears in the real app HTML, never in Vite placeholder
    Dim oHTTP
    Set oHTTP = CreateObject("WinHttp.WinHttpRequest.5.1")
    oHTTP.SetTimeouts 1000, 1000, 4000, 4000

    Dim bReady, i
    bReady = False
    For i = 1 To 90
        On Error Resume Next
        oHTTP.Open "GET", "http://localhost:5173/login", False
        oHTTP.Send
        If Err.Number = 0 Then
            If oHTTP.Status = 200 Then
                If InStr(oHTTP.ResponseText, "sveltekit-preload-data") > 0 Then
                    bReady = True
                End If
            End If
        End If
        Err.Clear
        On Error GoTo 0
        If bReady Then Exit For
        WScript.Sleep 1000
    Next

    oShell.Run "http://localhost:5173"
End If
