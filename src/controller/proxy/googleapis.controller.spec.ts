import { Test, TestingModule } from '@nestjs/testing';
import { GoogleApisController } from './googleapis.controller';

describe('GoogleApisController', () => {
  let controller: GoogleApisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleApisController],
    }).compile();

    controller = module.get<GoogleApisController>(GoogleApisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
