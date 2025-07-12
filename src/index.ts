import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import AWS from 'aws-sdk';

dotenv.config();

const app = express();
app.use(express.json());

// Autenticação com API Key
app.use((req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'];
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Configuração da AWS
AWS.config.update({
  region: 'us-east-1', // Você pode mudar conforme necessário
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const sns = new AWS.SNS();

// Endpoint para enviar SMS
app.post('/send-sms', async (req: Request, res: Response) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "Campos 'phone' e 'message' são obrigatórios." });
  }

  const params = {
    Message: message,
    PhoneNumber: phone
  };

  try {
    const result = await sns.publish(params).promise();

    const log = {
      phone,
      message,
      messageId: result.MessageId,
      date: new Date().toISOString(),
    };

    const logs = fs.existsSync('logs.json')
      ? JSON.parse(fs.readFileSync('logs.json', 'utf8'))
      : [];
    logs.push(log);
    fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));

    res.json({ success: true, messageId: result.MessageId });
  } catch (error: any) {
    console.error('Erro ao enviar SMS:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API SMS AWS rodando na porta ${PORT}`);
});
