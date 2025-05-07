import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CourseStudent } from './entities/course-student.entity';
import { Student } from '../student/entities/student.entity';
import { Course } from './entities/course.entity';

import { CourseService } from './course.service';
import { CourseController } from './course.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Student, CourseStudent])],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
