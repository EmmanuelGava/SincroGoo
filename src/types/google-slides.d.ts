import { slides_v1 } from 'googleapis';

declare module 'googleapis' {
  export namespace slides_v1 {
    export interface Schema$Thumbnail {
      contentUrl?: string;
      height?: number;
      width?: number;
    }

    export interface Schema$Presentation {
      presentationId: string;
      slides: Array<{
        objectId: string;
        pageElements: Array<{
          objectId: string;
          shape?: {
            text: {
              textElements: Array<{
                textRun?: {
                  content: string;
                };
              }>;
            };
          };
        }>;
      }>;
    }

    export interface Schema$BatchUpdatePresentationRequest {
      requests: Array<{
        replaceAllText?: {
          containsText?: {
            text: string;
            matchCase?: boolean;
          };
          replaceText: string;
        };
      }>;
    }

    export interface Schema$BatchUpdatePresentationResponse {
      presentationId: string;
      replies: Array<{
        replaceAllText?: {
          occurrencesChanged: number;
        };
      }>;
    }
  }
} 