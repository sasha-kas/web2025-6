const express = require('express');
const { program } = require('commander');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

program
  .requiredOption('-h, --host <host>', 'Host')
  .requiredOption('-p, --port <port>', 'Port')
  .requiredOption('-c, --cache <dir>', 'Cache directory')
  .parse(process.argv);

const { host, port, cache } = program.opts();

if (!fs.existsSync(cache)) {
  console.error('Cache directory does not exist.');
  process.exit(1);
}

const app = express();

app.get('/', (req, res) => res.send('Server is running.'));
app.get('/notes/:name', async (req, res) => {
  const noteName = req.params.name;
  const filePath = `${cache}/${noteName}`;

  try {
    await fs.promises.access(filePath);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    res.status(200).send(content);
  } catch (err) {
    res.status(404).send('Note not found');
  }
});

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Cache directory: ${cache}`);
});

