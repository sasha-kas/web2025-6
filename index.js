const express = require('express');
const { program } = require('commander');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const multer = require('multer');
const upload = multer();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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
app.use(express.text());

/**
 * @swagger
 * /:
 *   get:
 *     summary: перевірити роботу сервера
 *     tags: [root]
 *     responses:
 *       200:
 *         description: сервер працює
 */
app.get('/', (req, res) => res.send('Server is running.'));

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: отримати одну нотатку за ім'ям
 *     tags: [notes]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: вміст нотатки
 *       404:
 *         description: нотатку не знайдено
 */

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
/**
 * @swagger
 * /cache/{name}:
 *   put:
 *     summary: оновити існуючу нотатку
 *     tags: [notes]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: нотатку оновлено
 *       404:
 *         description: нотатку не знайдено
 */
app.put('/cache/:name', async (req, res) => {
  const noteName = req.params.name;
  const filePath = path.join(cache, noteName);

  try {
    await fs.promises.access(filePath);
    await fs.promises.writeFile(filePath, req.body, 'utf-8');
    res.status(200).send('Note updated');
  } catch (err) {
    res.status(404).send('Note not found');
  }
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: видалити нотатку
 *     tags: [notes]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: нотатку видалено
 *       404:
 *         description: нотатку не знайдено
 */
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

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: отримати всі нотатки
 *     tags: [notes]
 *     responses:
 *       200:
 *         description: список нотаток
 *       404:
 *         description: нотатки не знайдено
 */
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
app.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /write:
 *   post:
 *     summary: створити нову нотатку
 *     tags: [notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *               note_text:
 *                 type: string
 *     responses:
 *       201:
 *         description: нотатку створено
 *       400:
 *         description: неправильні дані або нотатка вже існує
 */
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
app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Note API',
      version: '1.0.0',
      description: 'API для роботи з нотатками',
    },
  },
  apis: [__filename], //документує всі ендпоінти в цьому файлі
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Cache directory: ${cache}`);
});

