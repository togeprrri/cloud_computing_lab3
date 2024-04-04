import http from 'http';

import fs from 'fs';
import path from 'path';


import { BlobServiceClient } from '@azure/storage-blob';
import { MongoClient } from 'mongodb';
import 'dotenv/config';

// Load in environment variables
const mongodbUri = process.env.MONGODB_URI;
const accountName = process.env.ACCOUNT_NAME;
const sasToken = process.env.SAS_TOKEN;
const containerName = process.env.CONTAINER_NAME;

// Establishes a connection with Azure Blob Storage
const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net/?${sasToken}`);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Connect to MongoDB
const client = new MongoClient(mongodbUri);
client.connect();

import { QueueClient } from "@azure/storage-queue";
import { ServiceBusClient } from "@azure/service-bus";
import { DefaultAzureCredential } from '@azure/identity';

// // Create a unique name for the queue
const queueName = "quickstartlab3volodymyrivasiuk"

// // Instantiate a QueueClient which will be used to create and interact with a queue
const queueClient = new QueueClient(`https://${accountName}.queue.core.windows.net/${queueName}`, new DefaultAzureCredential());

const fullyQualifiedNamespace = "lab4-Ivasiuk.servicebus.windows.net";
const credential = new DefaultAzureCredential();
const serviceBusClient = new ServiceBusClient(fullyQualifiedNamespace, credential);
const sender = serviceBusClient.createSender(queueName);
const receiver = serviceBusClient.createReceiver(queueName);

//--------------------------------------------------------------
// Перед вашим http.createServer

async function listBlobs() {
    
    let blobs = containerClient.listBlobsFlat();
    const blobUrls = [];
    for await (const blob of blobs) {
        const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blob.name}`;
        blobUrls.push(blobUrl);
    }
    return blobUrls;
}

//--------------------------------------------------------------



const server = http.createServer(async (req, res) => {
    // В середині вашого http.createServer, перед іншими маршрутами
    if (req.url === '/api/images' && req.method === 'GET') {
        listBlobs().then(blobUrls => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(blobUrls));
        }).catch(error => {
            console.error('Error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        });
    } else
        if (req.url === '/') { // Додавання маршруту для кореня
            fs.readFile(path.join("", 'index.html'), (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading index.html');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            });
        } else if (req.url === '/api/upload' && req.method === 'POST') {
            handleImageUpload(req, res);
        } else if (req.url === '/create-queue' && req.method === 'GET') {
            await createQueue(res);
        } else if (req.url === '/add-messages' && req.method === 'GET') {
            await addMessages(res);
        } else if (req.url === '/peek-messages' && req.method === 'GET') {
            await peekMessages(res);
        } else if (req.url === '/receive-messages' && req.method === 'GET') {
            await receiveMessages(res);
        }

        else if (req.url === '/add-messagesb' && req.method === 'GET') {
            await addMessagesb(res);
        } else if (req.url === '/receive-messagesb' && req.method === 'GET') {
            await receiveMessagesb(res);
        }

        else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
});



async function addMessagesb(res) {
    try {
        await sender.sendMessages([
            { body: "First message" },
            { body: "Second message" },
            { body: "Third message" }
        ]);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end("Messages added to the queue");
    } catch (error) {
        res.writeHead(500);
        res.end("Error adding messages: " + error.message);
    }
}

async function receiveMessagesb(res) {
    try {
        const messages = await receiver.receiveMessages(5, { maxWaitTimeInMs: 5000 });
        const messagesText = messages.map((message, index) => {
            receiver.completeMessage(message); // Підтвердити отримання повідомлення
            return `Received message ${index + 1}: ${message.body}`;
        }).join("<br>");
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(messagesText);
    } catch (error) {
        res.writeHead(500);
        res.end("Error receiving messages: " + error.message);
    }
}

async function createQueue(res) {
    try {
        const createQueueResponse = await queueClient.create();
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end("Queue created, requestId: " + createQueueResponse.requestId);
    } catch (error) {
        res.writeHead(500);
        res.end("Error creating queue: " + error.message);
    }
}

async function addMessages(res) {
    try {
        await queueClient.sendMessage("First message");
        await queueClient.sendMessage("Second message");
        const sendMessageResponse = await queueClient.sendMessage("Third message");
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end("Messages added, requestId: " + sendMessageResponse.requestId);
    } catch (error) {
        res.writeHead(500);
        res.end("Error adding messages: " + error.message);
    }
}

async function peekMessages(res) {
    try {
        const peekedMessages = await queueClient.peekMessages({ numberOfMessages: 5 });
        let messagesText = peekedMessages.peekedMessageItems.map((message, index) => `Message ${index + 1}: ${message.messageText}`).join("<br>");
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(messagesText);
    } catch (error) {
        res.writeHead(500);
        res.end("Error peeking at messages: " + error.message);
    }
}

async function receiveMessages(res) {
    try {
        const receivedMessagesResponse = await queueClient.receiveMessages({ numberOfMessages: 5 });
        let messagesText = receivedMessagesResponse.receivedMessageItems.map((message, index) => {
            return `Received message ${index + 1}: ${message.messageText}`;
        }).join("<br>");
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(messagesText);
    } catch (error) {
        res.writeHead(500);
        res.end("Error receiving messages: " + error.message);
    }
}

const port = 8080;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

async function handleImageUpload(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/upload' && req.method === 'POST') {
        try {
            // Extract metadata from headers
            const { fileName, caption, fileType } = await extractMetadata(req.headers);

            console.log('Uploading image:', fileName);
            console.log('Caption:', caption);
            console.log('File type:', fileType);

            // Upload the image as a to Azure Storage Blob as a stream
            const imageUrl = await uploadImageStreamed(fileName, req);

            // Store the metadata in MongoDB
            await storeMetadata(fileName, caption, fileType, imageUrl);

            res.writeHead(201);
            res.end(JSON.stringify({ message: 'Image uploaded and metadata stored successfully', imageUrl }));
        } catch (error) {
            console.error('Error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
}

async function extractMetadata(headers) {
    const contentType = headers['content-type'];
    const fileType = contentType.split('/')[1];
    const contentDisposition = headers['content-disposition'] || '';
    const caption = headers['x-image-caption'] || 'No caption provided';
    const matches = /filename="([^"]+)"/i.exec(contentDisposition);
    const fileName = matches?.[1] || `image-${Date.now()}.${fileType}`;
    return { fileName, caption, fileType };
}

async function uploadImageStreamed(blobName, dataStream) {
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadStream(dataStream);
    return blobClient.url;
}

async function storeMetadata(name, caption, fileType, imageUrl) {
    const collection = client.db("tutorial").collection('metadata');
    await collection.insertOne({ name, caption, fileType, imageUrl });
}


// --------------------------------------lab2------------------------------------------

// console.log("\nCreating queue...");
// console.log("\t", queueName);

// // // Create the queue
// const createQueueResponse = await queueClient.create();
// console.log("Queue created, requestId:", createQueueResponse.requestId);

// console.log("\nAdding messages to the queue...");

// // Send several messages to the queue
// await queueClient.sendMessage("First message");
// await queueClient.sendMessage("Second message");
// const sendMessageResponse = await queueClient.sendMessage("Third message");

// console.log("Messages added, requestId:", sendMessageResponse.requestId);

// console.log("\nPeek at the messages in the queue...");

// // Peek at messages in the queue
// const peekedMessages = await queueClient.peekMessages({ numberOfMessages : 5 });

// for (let i = 0; i < peekedMessages.peekedMessageItems.length; i++) {
//     // Display the peeked message
//     console.log("\t", peekedMessages.peekedMessageItems[i].messageText);
// }


// console.log("\nReceiving messages from the queue...");

// //Get messages from the queue
// const receivedMessagesResponse = await queueClient.receiveMessages({ numberOfMessages : 5 });

// console.log("Messages received, requestId:", receivedMessagesResponse.requestId);