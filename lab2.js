import { QueueClient } from "@azure/storage-queue";
import { DefaultAzureCredential } from '@azure/identity';

const accountName = "lab3storageaccount1";


document.addEventListener("DOMContentLoaded", function() {
    console.log("got there")
    const outputElement = document.getElementById("output");
    const queueName = "quickstartlab3iraivanishak";
    const queueClient = new QueueClient(`https://${accountName}.queue.core.windows.net/${queueName}`, new DefaultAzureCredential());

    async function createQueue() {
        try {
            const createQueueResponse = await queueClient.create();
            outputElement.innerHTML += "Queue created, requestId: " + createQueueResponse.requestId + "<br>";
        } catch (error) {
            outputElement.innerHTML += "Error creating queue: " + error.message + "<br>";
        }
    }

    async function addMessages() {
        try {
            await queueClient.sendMessage("First message");
            await queueClient.sendMessage("Second message");
            const sendMessageResponse = await queueClient.sendMessage("Third message");
            outputElement.innerHTML += "Messages added, requestId: " + sendMessageResponse.requestId + "<br>";
        } catch (error) {
            outputElement.innerHTML += "Error adding messages: " + error.message + "<br>";
        }
    }

    async function peekMessages() {
        try {
            const peekedMessages = await queueClient.peekMessages({ numberOfMessages: 5 });
            peekedMessages.peekedMessageItems.forEach((message, index) => {
                outputElement.innerHTML += `Message ${index + 1}: ${message.messageText}<br>`;
            });
        } catch (error) {
            outputElement.innerHTML += "Error peeking at messages: " + error.message + "<br>";
        }
    }

    async function receiveMessages() {
        try {
            const receivedMessagesResponse = await queueClient.receiveMessages({ numberOfMessages: 5 });
            receivedMessagesResponse.receivedMessageItems.forEach((message, index) => {
                outputElement.innerHTML += `Received message ${index + 1}: ${message.messageText}<br>`;
                // Здесь вы также можете удалить сообщение, используя queueClient.deleteMessage(message.messageId, message.popReceipt)
            });
        } catch (error) {
            outputElement.innerHTML += "Error receiving messages: " + error.message + "<br>";
        }
    }

    document.getElementById("createQueue").addEventListener("click", createQueue);
    document.getElementById("addMessages").addEventListener("click", addMessages);
    document.getElementById("peekMessages").addEventListener("click", peekMessages);
    document.getElementById("receiveMessages").addEventListener("click", receiveMessages);
});
