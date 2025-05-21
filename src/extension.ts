// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let statusBarItem: vscode.StatusBarItem;

function updateStatusBar(enabled: boolean) {
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.command = 'vibecommit.toggle';
        statusBarItem.show();
    }
    statusBarItem.text = enabled ? 'VibeCommit: ON' : 'VibeCommit: OFF';
}

async function commitFile(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration('vibecommit');
    const messagePrefix = config.get<string>('messagePrefix', 'chore(vibe)');
    const includeTimestamp = config.get<boolean>('includeTimestamp', true);
    // Placeholder for future LLM integration
    const timestamp = new Date().toISOString();
    const fileName = vscode.workspace.asRelativePath(document.uri);
    const message = `${messagePrefix}: ${includeTimestamp ? timestamp + ' ' : ''}updated ${fileName}`;

    try {
        await execAsync(`git add "${document.fileName}"`);
        await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Git commit failed: ${msg}`);
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vibecommit" is now active!');

    const toggleCmd = vscode.commands.registerCommand('vibecommit.toggle', async () => {
        const enabled = context.workspaceState.get<boolean>('vibecommit.enabled', false);
        await context.workspaceState.update('vibecommit.enabled', !enabled);
        updateStatusBar(!enabled);
        vscode.window.showInformationMessage(`VibeCommit ${!enabled ? 'Enabled' : 'Disabled'}`);
    });
    context.subscriptions.push(toggleCmd);

    updateStatusBar(context.workspaceState.get<boolean>('vibecommit.enabled', false));

    vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (!context.workspaceState.get<boolean>('vibecommit.enabled', false)) {
            return;
        }
        await commitFile(document);
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
