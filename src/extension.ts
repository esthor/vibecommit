// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let statusBarItem: vscode.StatusBarItem;
const outputChannel = vscode.window.createOutputChannel('VibeCommit');

function updateStatusBar(enabled: boolean) {
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.command = 'vibecommit.toggle';
        statusBarItem.show();
    }
    statusBarItem.text = enabled ? 'VibeCommit: ON' : 'VibeCommit: OFF';
    outputChannel.appendLine(`status bar updated: ${enabled ? 'ON' : 'OFF'}`);
}

export async function generateCommitMessage(document: vscode.TextDocument): Promise<string> {
    const config = vscode.workspace.getConfiguration('vibecommit');
    const useLLM = config.get<boolean>('useLLM', false);
    const messagePrefix = config.get<string>('messagePrefix', 'chore(vibe)');
    const includeTimestamp = config.get<boolean>('includeTimestamp', true);
    if (useLLM) {
        const commands = await vscode.commands.getCommands(true);
        const llmCmd = commands.find((c) =>
            c === 'github.copilot.generateCommitMessage' ||
            c === 'github.copilotChat.generateCommitMessage'
        );
        if (llmCmd) {
            try {
                const llmMessage = await vscode.commands.executeCommand<string>(llmCmd);
                if (llmMessage) {
                    outputChannel.appendLine('Commit message generated via LLM');
                    return llmMessage;
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                vscode.window.showWarningMessage(`LLM generation failed: ${msg}`);
            }
        } else {
            outputChannel.appendLine('LLM commit message command not found');
        }
    }
    const timestamp = new Date().toISOString();
    const fileName = vscode.workspace.asRelativePath(document.uri);
    return `${messagePrefix}: ${includeTimestamp ? timestamp + ' ' : ''}updated ${fileName}`;
}

async function commitFile(document: vscode.TextDocument) {
    const message = await generateCommitMessage(document);
    try {
        await execAsync(`git add "${document.fileName}"`);
        await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`);
        outputChannel.appendLine(`Committed ${document.fileName}`);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Git commit failed: ${msg}`);
        outputChannel.appendLine(`Git commit failed: ${msg}`);
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
