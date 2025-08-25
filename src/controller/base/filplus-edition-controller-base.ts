import {
  FilPlusEdition,
  getCurrentFilPlusEdition,
  getFilPlusEditionById,
} from 'src/utils/filplus-edition';
import {
  FilPlusEditionDefaultCurrentRequest,
  FilPlusEditionRequest,
} from './types.filplus-edition-controller-base';
import { stringToNumber } from 'src/utils/utils';
import { BadRequestException } from '@nestjs/common';
import { ControllerBase } from './controller-base';

export class FilPlusEditionControllerBase extends ControllerBase {
  public getFilPlusEditionFromRequest(
    query?: FilPlusEditionRequest | FilPlusEditionDefaultCurrentRequest,
  ): FilPlusEdition | null {
    if (query?.editionId) {
      try {
        const edition = getFilPlusEditionById(stringToNumber(query.editionId));

        if (edition) {
          return edition;
        } else {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error('Edition not found');
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        throw new BadRequestException(`Invalid editionId: ${query.editionId}`);
      }
    } else {
      if (query instanceof FilPlusEditionDefaultCurrentRequest) {
        return getCurrentFilPlusEdition();
      } else {
        return null;
      }
    }
  }
}
