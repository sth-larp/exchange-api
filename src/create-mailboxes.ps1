param (
    [Parameter(Mandatory = $true)] [string] $InputFile
)

#$fileName = "params.json"

if(-not (Test-Path $InputFile)){
    Write-Error "Can't read file $InputFile!"
    exit
}

$login = "alice\andy"
$password = "de@sEx2@!7"
$OU = "OU=Users,OU=Org,DC=alice,DC=local"

$usersList  = Get-Content -Path $InputFile -Encoding UTF8 | Out-String | ConvertFrom-Json

$secPassword = $password | ConvertTo-SecureString -AsPlainText -Force
$creds = new-object -typename System.Management.Automation.PSCredential -argumentlist $login, $secPassword


$session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://ex01.alice.local/PowerShell/ -Authentication Kerberos -Credential $creds -WarningAction SilentlyContinue


$ret = @{ status = ""; message =""; users = @()  }

if(!$session){ 
    $ret.status = "global-error";
    $ret.message = "Can't open session to Exchange server!"
    $ret | ConvertTo-Json | Write-Host
    exit
} 

Import-PSSession $session -AllowClobber -WarningAction SilentlyContinue -DisableNameChecking | Out-Null

$ret.status = "ok"

$usersList.users | %{

    $user = $_

    $pass = $user.password | ConvertTo-SecureString -AsPlainText -Force
    $upn = $user.login + "@alice.digital"
    $sma = "user" + $user.id

    
    try { 
        
        $mailbox = Get-Mailbox $sma -ErrorAction SilentlyContinue
    
        if($mailbox -eq $null){
            #Create Mailbox

            $mailbox = New-Mailbox -Name $sma -Password $pass -UserPrincipalName $upn -DisplayName $user.fullName `
                -FirstName $user.firstName -LastName $user.lastName -Alias $user.login -OrganizationalUnit $OU -SamAccountName $sma `
                -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
            
            if(!$mailbox){
                throw "Mailbox creation error"
            }

            Set-Mailbox $sma -ExtensionCustomAttribute1 $user.id -ExtensionCustomAttribute2 $user.password -HiddenFromAddressListsEnabled:$true -WarningAction SilentlyContinue -ErrorAction SilentlyContinue | Out-Null
          
            
            Start-Sleep -s 1
            Set-MailboxRegionalConfiguration $sma -Language ru-RU -TimeZone "Russian Standard Time"


            $ret.users += @{ id = $user.id; login = $user.login; result = "created" }
        }else{
            #update Mailbox

            if( ($mailbox.Alias -ne $user.login) -or ($mailbox.DisplayName -ne $user.fullName) -or ($mailbox.ExtensionCustomAttribute2 -ne $user.password) ) {

                $mailbox | Set-Mailbox -Password $pass -UserPrincipalName $upn -DisplayName $user.fullName -ExtensionCustomAttribute2 $user.password`
                    -Alias $user.login -WarningAction SilentlyContinue  -ErrorAction SilentlyContinue | Out-Null
         
                if(!$?){
                    throw "Mailbox update error"
                }

                get-user $sma | Set-User -FirstName $user.firstName -LastName $user.lastName  -ErrorAction SilentlyContinue -WarningAction SilentlyContinue | out-null

                $ret.users += @{ id = $user.id; login = $user.login; result = "updated" }
            }else{
                $ret.users += @{ id = $user.id; login = $user.login; result = "not changed" }
            }
        }
    } 
    catch {
        $ret.users += @{ id = $user.id; login = $user.login; result = $_.Exception }
        $ret.status = "error"
    }
}


#Remove-Item -Path $InputFile -Force | Out-Null

$ret | ConvertTo-Json | Write-Host
