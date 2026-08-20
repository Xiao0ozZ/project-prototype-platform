import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function selectLocalDirectory({ platform = process.platform } = {}) {
  let command;
  let args;
  if (platform === 'win32') {
    command = 'powershell.exe';
    args = [
      '-NoProfile',
      '-STA',
      '-Command',
      "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = '选择包含 project.json 的项目文件夹'; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $dialog.SelectedPath }",
    ];
  } else if (platform === 'darwin') {
    command = 'osascript';
    args = ['-e', 'POSIX path of (choose folder with prompt "选择包含 project.json 的项目文件夹")'];
  } else {
    command = 'zenity';
    args = ['--file-selection', '--directory', '--title=选择包含 project.json 的项目文件夹'];
  }
  try {
    const { stdout } = await execFileAsync(command, args, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5 * 60 * 1000,
    });
    return String(stdout || '').trim();
  } catch (error) {
    if (error.code === 1 || error.killed) return '';
    const wrapped = new Error(`无法打开系统文件夹选择器：${error.message}`);
    wrapped.code = 'DIRECTORY_PICKER_UNAVAILABLE';
    throw wrapped;
  }
}
