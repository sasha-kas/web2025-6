const express = require('express');
const { program } = require('commander');
const fs = require('fs');

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

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Cache directory: ${cache}`);
});

