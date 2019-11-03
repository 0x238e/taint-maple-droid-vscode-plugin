import * as vscode from 'vscode';

import * as path from 'path';
import { TextDecoder } from 'util';

let diagCollection: vscode.DiagnosticCollection;

export function activate(ctx: vscode.ExtensionContext) {
	diagCollection = vscode.languages.createDiagnosticCollection();
	ctx.subscriptions.push(diagCollection);
	let pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], 'leakage/leakage.*');
	let watcher = vscode.workspace.createFileSystemWatcher(pattern);
	watcher.onDidChange(e => handleLeakageFile(e));
	watcher.onDidCreate(e => handleLeakageFile(e));

	try {
		handleLeakageJSON(vscode.Uri.parse(`${vscode.workspace.workspaceFolders![0].uri.path}/leakage/leakage.json`));
	}	catch(error) {
		console.log(`Leakage file not found! Raw error: ${error}`);
	}
}

export function deactivate() {}

interface RawDiagIssue {
	file: string;
	lineno: [number, number];
	msg: string;
}

function handleLeakageFile(e: vscode.Uri) {
	if (path.basename(e.path) === 'leakage.json') {
		handleLeakageJSON(e);
	} else if (path.basename(e.path) === 'leakage.png') {
		handleLeakagePNG(e);
	}
}

function handleLeakageJSON(e: vscode.Uri) {
	vscode.workspace.fs.readFile(e).then(
		value => {
			let content = new TextDecoder('utf-8').decode(value);
			let rawIssues: Array<RawDiagIssue>;
			try {
				rawIssues = JSON.parse(content);
			} catch (error) {
				vscode.window.showErrorMessage(`Faieled to parse leakage.json due to: ${error}`);
				return;
			}
			let diagMap: Map<string, Array<vscode.Diagnostic>> = new Map();
			try {
				rawIssues.forEach(rawIssue => {
					let file: string;
					file = `${vscode.workspace.workspaceFolders![0].uri.path}/${rawIssue.file}`;
					let diags = diagMap.get(file);
					if (!diags) {
						diags = [];
					}
					let range = new vscode.Range(rawIssue.lineno[0], 0, rawIssue.lineno[1], 0);
					let diag = new vscode.Diagnostic(range, rawIssue.msg);
					diags.push(diag);
					diagMap.set(file, diags);
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Faieled to parse leakage.json due to: ${error}`);
				return;
			}
			diagCollection.clear();
			diagMap.forEach((diags, file) => {
				diagCollection.set(vscode.Uri.parse(file), diags);
			});
		},
		reason => vscode.window.showErrorMessage(`Faieled to read leakage.json due to: ${reason}`)
	);
}

function handleLeakagePNG(e: vscode.Uri) {
	console.log("Unimplemented!");
}
