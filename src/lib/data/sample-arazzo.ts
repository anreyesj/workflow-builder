import type { ArazzoSpec } from '$lib/types/arazzo';

/**
 * Sample Arazzo spec based on the Petstore API.
 * Demonstrates a two-step workflow: look up a pet, then update its status.
 */
export const sampleArazzoSpec: ArazzoSpec = {
  arazzo: '1.0.0',
  info: {
    title: 'Petstore Workflows',
    summary: 'Example workflows using the Petstore API',
    description:
      'Demonstrates chained API requests using the OpenAPI Petstore specification as a source.',
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
      summary: 'Get a pet and update its status',
      description:
        'Retrieves a pet by ID from the Petstore, then updates the pet status to "sold".',
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
          successCriteria: [
            {
              condition: '$statusCode == 200'
            }
          ],
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
          successCriteria: [
            {
              condition: '$statusCode == 200'
            }
          ],
          onFailure: [
            {
              name: 'retry-on-server-error',
              type: 'retry',
              retryCount: 3,
              retryAfter: 1,
              criteria: [
                {
                  condition: '$statusCode == 503'
                }
              ]
            }
          ]
        }
      ],
      outputs: {
        updatedPetId: '$steps.update-pet-status.outputs.petId'
      }
    }
  ]
};
