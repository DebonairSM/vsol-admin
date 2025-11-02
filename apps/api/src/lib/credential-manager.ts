import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CREDENTIAL_TARGET = 'VSolAdmin:SQLCipherKey';

/**
 * Retrieve the SQLCipher encryption key from Windows Credential Manager.
 * 
 * The key should be stored using the PowerShell command:
 * cmdkey /generic:VSolAdmin:SQLCipherKey /user:vsol /pass:<your-key>
 * 
 * Or using the enable-sqlcipher.ps1 script which handles this automatically.
 */
export async function getSQLCipherKey(): Promise<string> {
  try {
    // For development, allow fallback to environment variable
    if (process.env.NODE_ENV === 'development' && process.env.SQLCIPHER_KEY) {
      console.warn('⚠️  Using SQLCIPHER_KEY from .env (development only)');
      return process.env.SQLCIPHER_KEY;
    }

    // Production: retrieve from Windows Credential Manager
    const { stdout } = await execAsync(
      `powershell -Command "$cred = cmdkey /list | Select-String '${CREDENTIAL_TARGET}'; if ($cred) { 'found' } else { 'not-found' }"`
    );

    if (stdout.trim() === 'not-found') {
      throw new Error(
        `SQLCipher key not found in Windows Credential Manager. ` +
        `Run: cmdkey /generic:${CREDENTIAL_TARGET} /user:vsol /pass:<your-key>`
      );
    }

    // Retrieve the password using PowerShell
    // Note: Windows Credential Manager doesn't provide direct password retrieval via cmdkey
    // We need to use a more secure approach with .NET credential classes
    const script = `
      $target = "${CREDENTIAL_TARGET}"
      Add-Type -AssemblyName System.Security
      $cred = New-Object System.Net.NetworkCredential("vsol", (Get-StoredCredential -Target $target).Password)
      $cred.Password
    `;

    // Alternative approach: Use a simpler PowerShell method
    const retrieveScript = `
      $credManager = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace CredManager {
    public class Credential {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct CREDENTIAL {
            public int Flags;
            public int Type;
            public string TargetName;
            public string Comment;
            public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
            public int CredentialBlobSize;
            public IntPtr CredentialBlob;
            public int Persist;
            public int AttributeCount;
            public IntPtr Attributes;
            public string TargetAlias;
            public string UserName;
        }

        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool CredFree(IntPtr cred);

        public static string GetPassword(string target) {
            IntPtr credPtr;
            if (CredRead(target, 1, 0, out credPtr)) {
                try {
                    var cred = Marshal.PtrToStructure<CREDENTIAL>(credPtr);
                    if (cred.CredentialBlobSize > 0) {
                        byte[] passwordBytes = new byte[cred.CredentialBlobSize];
                        Marshal.Copy(cred.CredentialBlob, passwordBytes, 0, cred.CredentialBlobSize);
                        return Encoding.Unicode.GetString(passwordBytes);
                    }
                } finally {
                    CredFree(credPtr);
                }
            }
            return null;
        }
    }
}
"@
      Add-Type -TypeDefinition $credManager -Language CSharp
      [CredManager.Credential]::GetPassword("${CREDENTIAL_TARGET}")
    `;

    const { stdout: password } = await execAsync(
      `powershell -ExecutionPolicy Bypass -Command "${retrieveScript.replace(/"/g, '`"').replace(/\n/g, ' ')}"`
    );

    const key = password.trim();
    if (!key) {
      throw new Error('SQLCipher key is empty in Windows Credential Manager');
    }

    return key;
  } catch (error) {
    console.error('❌ Failed to retrieve SQLCipher key:', error);
    throw new Error(
      'Could not retrieve SQLCipher encryption key from Windows Credential Manager. ' +
      'Please run scripts/enable-sqlcipher.ps1 to set up encryption.'
    );
  }
}

/**
 * Store the SQLCipher encryption key in Windows Credential Manager.
 * Used by the enable-sqlcipher.ps1 script.
 */
export async function setSQLCipherKey(key: string): Promise<void> {
  try {
    await execAsync(
      `cmdkey /generic:${CREDENTIAL_TARGET} /user:vsol /pass:${key}`
    );
    console.log('✅ SQLCipher key stored in Windows Credential Manager');
  } catch (error) {
    throw new Error(`Failed to store SQLCipher key: ${error}`);
  }
}

/**
 * Generate a secure random key for SQLCipher (64 characters hex = 256 bits)
 */
export function generateSQLCipherKey(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

