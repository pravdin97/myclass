const Koa = require('koa')
const koaBody = require('koa-body')
const _ = require('koa-route')
require('dotenv').config()

const app = new Koa()

app.use(koaBody({
    jsonLimit: '1kb'
}))

const { Lesson } = require('./db')
const { Teacher } = require('./db')
const { Student } = require('./db')
const { LessonStudent } = require('./db')
const { Op } = require('./db')
const sequelize = require('./db')
 
app.use(async (ctx, next) => {
    await next()
    const rt = ctx.response.get('X-Response-Time');
    console.log(`${ctx.method} ${ctx.url} - ${rt}`);
})

app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
})

// =============== ROUTES ==================
app.use(_.get('/hello', ctx => {
    ctx.body = 'Hello World!'
}))

app.use(_.get('/', async ctx => {
    const date = ctx.query.date, 
        status = parseInt(ctx.query.status), 
        teacherIds = ctx.query.teacherIds, 
        studentCount = ctx.query.studentCount, 
        page = parseInt(ctx.query.page)

    let lessonsPerPage = parseInt(ctx.query.lessonsPerPage)
    
    let options = {}
    let studentIncludeWhereClause = {}
    if (studentCount !== undefined) {
        let students = studentCount.split(',')

        if (students.length !== 1) {
            
        } else {
            let studentsCount = parseInt(students) 
            studentIncludeWhereClause = {
                
            }
        }
    }

    let teacherIncludeWhereClause = {}
    if (teacherIds !== undefined) {
        let teachers = teacherIds.split(',')
        let teacherValues = teachers.map(t => parseInt(t))
        let isContainNaN = teacherValues.includes(NaN)
        
        if (!isContainNaN)
            teacherIncludeWhereClause = {
                id: {
                    [Op.or]: teacherValues
                }
            }
    }

    options['include'] = [{
        model: Teacher, 
        where: teacherIncludeWhereClause,
        as: 'teachers'
    }, {
        model: Student,
        // attributes: {include: LessonStudent, attributes: ['visit'], where: {visit: true}},
        as: 'students'
    }]
    let where = {}
    
    // date here
    if (date !== undefined) {
        let dateValue = date.split(',')
        
        if (dateValue.length !== 1) {
            where['date'] = {
                [Op.between]: dateValue
            }
        } else {
            where['date'] = dateValue[0]
        }
    }
    
    if (!isNaN(status)) 
        where['status'] = status

    // add where clause
    options['where'] = where

    // pagination
    if (isNaN(lessonsPerPage))
            lessonsPerPage = 5
    if (!isNaN(page)) {
        options['offset'] = (page - 1) * lessonsPerPage
    }
    options['limit'] = lessonsPerPage
    
    let result = await Lesson.findAll(options)
    console.log(result)

    ctx.body = result
}))

app.use(_.post('/lessons', async ctx => {
    const teachers = ctx.request.body.teacherIds,
        title = ctx.request.body.title,
        days = ctx.request.body.days,
        firstDate = ctx.request.body.firstDate,
        lessonsCount = ctx.request.body.lessonsCount,
        lastDate = ctx.request.body.lastDate

    if (firstDate !== undefined) {
        let lesson = Lesson.build({
            title: title,
            status: 0,

        })
        lesson.get('title')
    } else throw('invalid request')
}))


app.on('error', (err, ctx) => {
    console.log('server error', err, ctx)
})

app.listen(3000)