const cors = require('cors');
const express = require('express');
const app = express();
const execFile = require('child_process').execFile;
const spawn = require('child_process').spawn;

const port = 3000;
const host = `http://localhost:${port}`;

const types = {
    "A": "Added", 
    "C": "Copied", 
    "D": "Deleted", 
    "M": "Modified", 
    "R": "Renamed", 
    "T": "Type", 
    "U": "Unmerged", 
    "X": "Unknown", 
    "B": "Broken"
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/public'));

app.get('/branches', (req, res) => {
    const path = req.query.path;

    let stdout = "";

    const child = spawn('git', ['-C', path, 'branch', '-a']);

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (data) => {
        stdout += data;
    });

    child.on('close', (exitCode) => {
        console.log("branches: ");

        res.json(stdout.trim().split("\n"));
    });
});

app.get('/commits', (req, res) => {
    const path = req.query.path;
    const branch = req.query.branch;

    const messages = [];

    const child = spawn('git', ['-C', path, 'log', '--pretty=format:%H|%an <%ae>|%ad|%at|%s', branch]);

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (data) => {
        const lines = data.trim().split("\n");

        lines.forEach((line) => {
            const [ hash, author, date, timestamp, message ] = line.split("|");

            messages.push({ hash: hash, author: author, date: date, timestamp: timestamp, message: message });
        });
    });

    child.on('close', (exitCode) => {
        console.log("messages: " + messages.length);

        res.json(messages);
    });
});

app.get('/changes', (req, res) => {
    const path = req.query.path;
    const hash = req.query.hash;

    const files = {};

    const child = spawn('git', ['-C', path, 'diff', '--name-status', hash + '~1', hash, '--diff-filter=dr', '--no-rename']);

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (data) => {
        const lines = data.trim().split("\n");

        lines.forEach((line) => {
            const [status, file] = line.split(/\t/);

            files[file] = types[status];
        });
    });

    child.on('close', (exitCode) => {
        console.log("changes: " + Object.keys(files).length);

        res.json(files);
    });
});

app.get('/files', (req, res) => {
    const path = req.query.path;
    const hash = req.query.hash;

	const files = [];

    const child = spawn('git', ['-C', path, 'ls-tree', '-r', '-l', hash]);

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (data) => {
        const lines = data.trim().split("\n");

        lines.forEach((line) => {
            const [ rest, file ] = line.split("\t");

            const [ mode, type, hash, size ] = rest.split(/ +/);

            files.push({ mode: mode, type: type, hash: hash, size: size, file: file });
        });
    });

    child.on('close', (exitCode) => {
        console.log("files: " + Object.keys(files).length);

        res.json(files);
    });
});

app.get('/content', (req, res) => {
    const path = req.query.path;
    const hash = req.query.hash;

    execFile('git', ['-C', path, 'show', hash], (error, stdout, stderr) => {
        res.send(stdout);
    });
});

app.get('/diff', (req, res) => {
    const path = req.query.path;
    const hash = req.query.hash;
    const file = req.query.file;

    execFile('git', ['-C', path, 'diff', hash + '~1', hash, '--', file], (error, stdout, stderr) => {
        res.send(stdout);
    });
});

app.listen(port, () => {
    console.log(`App listening at ${host}`);
});
