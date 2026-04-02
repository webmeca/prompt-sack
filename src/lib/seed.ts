import { db } from './db';

export async function seedDatabase() {
  const count = await db.prompts.count();
  if (count > 0) return;

  const collectionId = crypto.randomUUID();
  await db.collections.add({
    id: collectionId,
    name: 'Examples',
    createdAt: Date.now(),
  });

  const promptId1 = crypto.randomUUID();
  await db.prompts.add({
    id: promptId1,
    title: 'Code Review Assistant',
    body: `You are an expert software engineer. Please review the following code for:
1. Security vulnerabilities
2. Performance issues
3. Readability and maintainability

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\`

Please provide your feedback in a structured format with specific line references.`,
    collectionId,
    status: 'active',
    favorite: true,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
    tags: ['coding', 'review'],
  });

  await db.versions.add({
    id: crypto.randomUUID(),
    promptId: promptId1,
    body: `You are an expert software engineer. Please review the following code for:
1. Security vulnerabilities
2. Performance issues
3. Readability and maintainability

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\`

Please provide your feedback in a structured format with specific line references.`,
    summary: 'Initial version',
    createdAt: Date.now() - 100000,
    changeType: 'create',
    promoted: true
  });

  const promptId2 = crypto.randomUUID();
  await db.prompts.add({
    id: promptId2,
    title: 'Cold Email Generator',
    body: `Write a cold email to [prospect_name] at [company_name]. 
My company is [my_company] and we do [my_value_prop].

The tone should be [tone:string]. Keep it under 150 words.
Include a clear call to action asking for a 10-minute call next week.`,
    collectionId,
    status: 'active',
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['sales', 'email'],
  });

  await db.versions.add({
    id: crypto.randomUUID(),
    promptId: promptId2,
    body: `Write a cold email to [prospect_name] at [company_name]. 
My company is [my_company] and we do [my_value_prop].

The tone should be [tone:string]. Keep it under 150 words.
Include a clear call to action asking for a 10-minute call next week.`,
    summary: 'Initial version',
    createdAt: Date.now(),
    changeType: 'create',
    promoted: true
  });
}
