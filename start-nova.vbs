Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

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
    oShell.Run "cmd /k ""cd /d D:\nova-metal-crm && pnpm dev""", 7, False
    oShell.Popup "Nova Metal CRM is starting..." & Chr(13) & Chr(10) & "The browser will open automatically.", 15, "Nova Metal CRM", 64
    oShell.Run "http://localhost:5173"
End If
