import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

import { Configuration, OpenAIApi } from 'openai';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 } from 'uuid';

const secretsClient = new SecretsManagerClient({});
const dynamoClient = new DynamoDBClient({});

export async function handler() {
  const secret = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: 'open-api-key',
    })
  );

  if (!secret.SecretString) throw new Error('Failed to get secret');

  const apiKey = JSON.parse(secret.SecretString)['open-api-key'];

  const openai = new OpenAIApi(
    new Configuration({
      apiKey,
    })
  );

  // Get all characters in the DB, just scan as it's a small DB, if this grows might want to change access pattern
  const { Items: rawCharacters = [] } = await dynamoClient.send(
    new ScanCommand({
      TableName: process.env.CHARACTERS_TABLE,
    })
  );

  //@ts-ignore
  const characters = rawCharacters.map((character) => unmarshall(character));

  // Get all scenes in the DB, just scan as it's a small DB, if this grows might want to change access pattern
  const { Items: scenes = [] } = await dynamoClient.send(
    new ScanCommand({
      TableName: process.env.SCENES_TABLE,
    })
  );

  // Select random scene
  const selectedScene = unmarshall(scenes[Math.floor(Math.random() * scenes.length)]);

  const prompt = `
  請就${characters.length}個主角，名為${characters?.map((character: any) => character.name).join(' and ')}，創作一個繁體中文故事。故事需要設定在${selectedScene.description}的場景中，並且至少需要有 200 個字。
`;

  const result = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    max_tokens: 1000,
    temperature: 0.7,
  });

  const twoDaysFromNow = new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000);
  const storyTTL = Math.floor(twoDaysFromNow.getTime() / 1000);

  const story = result.data.choices[0].text || '';
  const storyParts = story.trim().split('\n');

  // Get title from the story
  const title = storyParts.shift();
  const description = storyParts.join('\n');

  // Insert new story into DDB
  await dynamoClient.send(
    new PutItemCommand({
      TableName: process.env.STORIES_TABLE,
      Item: marshall({
        id: v4(),
        title,
        characters,
        description,
        ttl: storyTTL,
        scene: selectedScene.description,
        createdAt: new Date().toISOString()
      }),
    })
  );
}
