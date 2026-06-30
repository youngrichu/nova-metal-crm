Set oShell = CreateObject("WScript.Shell")
oShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -File ""D:\nova-metal-crm\start-nova.ps1""", 1, False
