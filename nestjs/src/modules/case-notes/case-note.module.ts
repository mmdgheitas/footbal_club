import { Module } from '@nestjs/common';
import { CaseNoteController } from './case-note.controller';
import { CaseNoteService } from './case-note.service';

@Module({
  controllers: [CaseNoteController],
  providers: [CaseNoteService],
  exports: [CaseNoteService],
})
export class CaseNotesModule {}
