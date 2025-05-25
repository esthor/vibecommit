import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { generateCommitMessage } from '../extension';

suite('Extension Test Suite', () => {
        vscode.window.showInformationMessage('Start all tests.');

        test('Fallback message generation', async () => {
                const doc = {
                        uri: vscode.Uri.file('/tmp/test.ts'),
                        fileName: '/tmp/test.ts',
                        languageId: 'typescript',
                        getText: () => 'console.log("test")',
                } as vscode.TextDocument;

                const msg = await generateCommitMessage(doc);
                assert.ok(msg.includes('updated'));
        });

        test('LLM message generation', async () => {
                let called = false;
                const origExec = vscode.commands.executeCommand;
                const origGet = vscode.commands.getCommands;
                (vscode.commands as any).executeCommand = async () => {
                        called = true;
                        return 'llm message';
                };
                (vscode.commands as any).getCommands = async () => ['github.copilot.generateCommitMessage'];
                const config = vscode.workspace.getConfiguration('vibecommit');
                await config.update('useLLM', true, vscode.ConfigurationTarget.Global);
                const doc = {
                        uri: vscode.Uri.file('/tmp/test2.ts'),
                        fileName: '/tmp/test2.ts',
                        languageId: 'typescript',
                        getText: () => 'console.log("test")',
                } as vscode.TextDocument;
                const msg = await generateCommitMessage(doc);
                assert.strictEqual(msg, 'llm message');
                assert.ok(called);
                await config.update('useLLM', false, vscode.ConfigurationTarget.Global);
                (vscode.commands as any).executeCommand = origExec;
                (vscode.commands as any).getCommands = origGet;
        });
});
