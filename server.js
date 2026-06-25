import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

async function readData() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/progress', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load progress data.' });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    const { employeeId, currentStage, progress } = req.body;
    const data = await readData();
    const employee = data.employees.find((item) => item.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    employee.currentStage = currentStage;
    employee.progress = progress;
    await writeData(data);
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save progress data.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Onboarding tracker backend running at http://localhost:${port}`);
});
