const express = require('express');
const { program } = require('commander');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const multer = require('multer');
const upload = multer();

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
app.use(express.text());
app.put('/notes/:name', async (req, res) => {
  const noteName = req.params.name;
  const filePath = `${cache}/${noteName}`;

  try {
    await fs.promises.access(filePath);
    await fs.promises.writeFile(filePath, req.body, 'utf-8');
    res.status(200).send('Note updated');
  } catch (err) {
    res.status(404).send('Note not found');
  }
});
app.delete('/notes/:name', async (req, res) => {
  const noteName = req.params.name;
  const filePath = `${cache}/${noteName}`;

  try {
    await fs.promises.access(filePath); 
    await fs.promises.unlink(filePath); //видалення
    res.status(200).send('Note deleted');
  }
    catch (err) {
    res.status(404).send('Note not found');
  }
});
app.get('/notes', async (req, res) => {
  try {
    const files = await fs.promises.readdir(cache);
    const notes = [];

    for (const file of files) {
      const filePath = `${cache}/${file}`;
      const stat = await fs.promises.stat(filePath);

      if (!stat.isFile() || file.startsWith('.') || file === '.DS_Store') continue; 
        const text = await fs.promises.readFile(filePath, 'utf-8');
        notes.push({ name: file, text });
    }
    if (notes.length === 0) {
      res.status(404).send('No notes found');
    } else {
    res.status(200).json(notes);
  }
   } catch (err) {
    res.status(500).send('Failed to read notes');
  }
});
app.post('/write', upload.none(), async (req, res) => {
  const noteName = req.body.note_name;
  const noteText = req.body.note_text;

  if (!noteName || !noteText) {
    return res.status(400).send('Missing note name or text');
  }

  const filePath = path.join(cache, noteName);

  try {
    await fsp.access(filePath);
    //існує
    return res.status(400).send('Note already exists');
  } catch {
    //не існує, можна створити
    await fsp.writeFile(filePath, noteText, 'utf-8');
    res.status(201).send('Note created');
  }
});
app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Cache directory: ${cache}`);
});

