import type { ArazzoSpec } from '$lib/types/arazzo';

/**
 * Sample Arazzo spec demonstrating a "Standard Session" workflow pattern
 * inspired by the Blueprint project.  Each step is tied to an actual
 * source spec operation, with parameters mapped from workflow inputs.
 */
export const sampleArazzoSpec: ArazzoSpec = {
  arazzo: '1.0.1',
  info: {
    title: 'Standard Checkout Integration',
    summary: 'Arazzo workflow for a guardrail-compliant checkout session',
    description:
      'Defines the standard digital integration workflow: server calls POST /sessions ' +
      'with required fields mapped from workflow inputs, ensuring the generated spec ' +
      'is grounded in the actual source API operations.',
    version: '1.0.0'
  },
  sourceDescriptions: [
    {
      name: 'petstore',
      url: 'https://petstore3.swagger.io/api/v3/openapi.json',
      type: 'openapi'
    }
  ],
  workflows: [
    {
      workflowId: 'get-and-update-pet',
      summary: 'Get a pet then update its status',
      description:
        'Retrieves a pet by ID from the Petstore, then updates the pet status to "sold". ' +
        'Demonstrates parameter mapping from workflow inputs to operation parameters.',
      inputs: {
        type: 'object',
        properties: {
          petId: {
            type: 'integer',
            description: 'The ID of the pet to retrieve and update'
          }
        },
        required: ['petId']
      },
      steps: [
        {
          stepId: 'get-pet',
          description: 'Retrieve pet details by ID',
          operationId: 'petstore.getPetById',
          parameters: [
            {
              name: 'petId',
              in: 'path',
              value: '$inputs.petId'
            }
          ],
          successCriteria: [{ condition: '$statusCode == 200' }],
          outputs: {
            petName: '$response.body#/name',
            petStatus: '$response.body#/status'
          }
        },
        {
          stepId: 'update-pet-status',
          description: 'Update the pet status to sold',
          operationId: 'petstore.updatePetWithForm',
          parameters: [
            {
              name: 'petId',
              in: 'path',
              value: '$inputs.petId'
            },
            {
              name: 'status',
              in: 'query',
              value: 'sold'
            }
          ],
          successCriteria: [{ condition: '$statusCode == 200' }],
          onFailure: [
            {
              name: 'retry-on-server-error',
              type: 'retry',
              retryCount: 3,
              retryAfter: 1,
              criteria: [{ condition: '$statusCode == 503' }]
            }
          ]
        }
      ],
      outputs: {
        petName: '$steps.get-pet.outputs.petName',
        petStatus: '$steps.get-pet.outputs.petStatus'
      }
    }
  ]
};
