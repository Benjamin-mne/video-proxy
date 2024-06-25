import express, { Router } from 'express';
import cors from 'cors';
import axios from 'axios';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT ?? 3000;

const VIDEO_URL_BASE = 'https://pixeldrain.com/api/file/'

app.use(cors());

async function fetchWithRetries(url, options, retries = 10) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios(url, options);
            return response;
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            console.log(`Retrying... (${i + 1}/${retries})`);
        }
    }
}

const router = Router();

router.get('/video/:id', async (req, res) => {
    const { id } = req.params;
    const range = req.headers.range;

    if (!range) {
        res.status(400).send('Range header is required');
        return;
    }

    try {
        const response = await fetchWithRetries(`${VIDEO_URL_BASE}${id}`, {
            method: 'GET',
            responseType: 'stream',
            headers: {
                'Range': range
            },
            timeout: 10000
        });

        const contentRange = response.headers['content-range'];
        const contentLength = response.headers['content-length'];
        const acceptRanges = response.headers['accept-ranges'];
        const contentType = response.headers['content-type'];

        res.writeHead(206, {
            'Content-Range': contentRange,
            'Accept-Ranges': acceptRanges,
            'Content-Length': contentLength,
            'Content-Type': contentType,
        });

        response.data.pipe(res);
    } catch (error) {
        console.error('Error fetching video:', error);
        res.status(500).json({ message: 'Error fetching video', error: error.message });
    }
});

app.use('/api', router)

app.listen(port, () => {
  console.log(`Server on port: ${port}`);
});
