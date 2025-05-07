import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { FindManyOptions, Repository } from 'typeorm';

import { Course } from './entities/course.entity';
import { Student } from '../student/entities/student.entity';
import { CourseStudent } from './entities/course-student.entity';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaginationDto } from '../common/dto';

import { validateErrors } from '../utils';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,

    @InjectRepository(CourseStudent)
    private readonly courseStudentRepository: Repository<CourseStudent>,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    try {
      const data = this.courseRepository.create(createCourseDto);
      const newCourse = await this.courseRepository.save(data);

      return { ok: true, data: newCourse, message: 'Curso creado con éxito' };
    } catch (error) {
      validateErrors(error, 'un curso', 'nombre');
    }
  }

  async findAll(pagination: PaginationDto) {
    const { limit = 10, offset = 0 } = pagination;

    const findOptions: FindManyOptions<Course> = {
      take: limit,
      skip: offset,
      order: { id: 'ASC' },
    };

    const [courses, total] =
      await this.courseRepository.findAndCount(findOptions);

    return { data: courses, total };
  }

  async findOne(id: string) {
    const course = await this.courseRepository.findOneBy({ id });

    if (!course) throw new NotFoundException('Curso no encontrado');

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    const course = await this.findOne(id);

    try {
      Object.assign(course, updateCourseDto);

      const updatedCourse = await this.courseRepository.save(course);

      return { ok: true, data: updatedCourse, message: 'Curso actualizado' };
    } catch (error) {
      validateErrors(error, 'un curso', 'nombre');
    }
  }

  async remove(id: string) {
    const course = await this.findOne(id);

    await this.courseRepository.remove(course);

    return { ok: true, message: 'Curso eliminado con éxito' };
  }

  async addStudentToCourse(courseId: string, studentId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { courseStudents: true },
    });
    const student = await this.studentRepository.findOneBy({ id: studentId });

    if (!course) throw new NotFoundException('Curso no encontrado');
    if (!student) throw new NotFoundException('Estudiante no encontrado');

    const exists = await this.courseStudentRepository.findOne({
      where: { course: { id: courseId }, student: { id: studentId } },
    });

    if (exists)
      throw new BadRequestException(
        'El estudiante ya está inscrito en este curso',
      );

    const currentCount = course.courseStudents.length;
    if (currentCount >= course.maxStudents) {
      throw new BadRequestException(
        'El curso ha alcanzado el número máximo de estudiantes',
      );
    }

    const newEntry = this.courseStudentRepository.create({
      course,
      student,
    });

    await this.courseStudentRepository.save(newEntry);

    return { ok: true, message: 'Estudiante agregado al curso con éxito' };
  }

  async getStudentsFromCourse(courseId: string) {
    const course = await this.findOne(courseId);

    if (!course) throw new NotFoundException('Curso no encontrado');

    const [students, total] = await this.courseStudentRepository.findAndCount({
      where: {
        course: { id: courseId },
      },
      relations: {
        student: true,
      },
      order: { createdAt: 'ASC' },
    });

    return { course, students, total };
  }

  async removeStudentFromCourse(courseId: string, studentId: string) {
    const relation = await this.courseStudentRepository.findOne({
      where: {
        course: { id: courseId },
        student: { id: studentId },
      },
      relations: ['course', 'student'],
    });

    if (!relation)
      throw new NotFoundException('No se encontro un estudiante en el curso');

    await this.courseStudentRepository.remove(relation);

    return { ok: true, message: 'Estudiante eliminado del curso' };
  }
}
