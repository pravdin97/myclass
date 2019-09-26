const Sequelize = require('sequelize')
const Op = Sequelize.Op

const sequelize = new Sequelize(process.env.DBNAME, 
    process.env.DBUSER, process.env.DBPASSWORD, {
        host: 'localhost',
        dialect: 'postgres',
        timestamps: false
    }
)

// =============== MODELS ====================
const Model = Sequelize.Model
class Lesson extends Model {
}
Lesson.init({
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    date: {
        type: Sequelize.DATEONLY,
        allowNull: false
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    status: {
        type: Sequelize.INTEGER,
        validate: {
            isIn: [[0, 1]]
        },
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'lessons',
    timestamps: false
})

class Teacher extends Model {}
Teacher.init({
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'teachers',
    timestamps: false
})

class Student extends Model {}
Student.init({
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'students',
    timestamps: false
})

Lesson.belongsToMany(Teacher, {
    through: 'lesson_teachers',
    foreignKey: 'lesson_id',
    sourceKey: 'id',
    as: 'teachers'
})

Teacher.belongsToMany(Lesson, {
    through: 'lesson_teachers',
    foreignKey: 'teacher_id',
    sourceKey: 'id'
})

class LessonStudent extends Model {
}
LessonStudent.init({
    lesson_id: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    student_id: {
        type: Sequelize.INTEGER,
        allowNull: false
    }, 
    visit: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'lesson_students',
    timestamps: false
})
Lesson.belongsToMany(Student, { 
    through: LessonStudent,
    foreignKey: 'lesson_id',
    as: 'students'
 })
Student.belongsToMany(Lesson, { 
    through: LessonStudent, 
    foreignKey: 'student_id',
})
// Student.belongsTo(LessonStudent, {
//     foreignKey: 'student_id'
// })
LessonStudent.belongsTo(Student, {
    foreignKey: 'student_id'
})
// Lesson.belongsToMany(Student, {
//     through: 'lesson_students',
//     foreignKey: 'lesson_id',
//     sourceKey: 'id'
// })

// Student.belongsToMany(Lesson, {
//     through: 'lesson_students',
//     foreignKey: 'student_id',
//     sourceKey: 'id'
// })

// ================== MODELS ===================

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

sequelize.sync()

module.exports = {
    Lesson,
    Teacher,
    Student,
    LessonStudent,
    Op,
    sequelize
}