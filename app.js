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
const { Op } = require('./db')
 
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

app.use(_.get('/', async ctx => {
    const date = ctx.query.date, 
        status = parseInt(ctx.query.status), 
        teacherIds = ctx.query.teacherIds, 
        studentCount = ctx.query.studentsCount, 
        page = parseInt(ctx.query.page)

    if (isNaN(status) && ctx.query.status !== undefined)
        ctx.throw(400,'Invalid status value')
    if (isNaN(page) && ctx.query.page !== undefined)
        ctx.throw(400,'Invalid page value')

    let lessonsPerPage = parseInt(ctx.query.lessonsPerPage)
    if (isNaN(lessonsPerPage) && ctx.query.lessonsPerPage !== undefined)
        ctx.throw(400,'Invalid lessonsPerPage value')
    
    let options = {}

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
        as: 'teachers',
        
    }, {
        model: Student,
        as: 'students',
    }]
    let where = {}
    
    
    // date
    if (date !== undefined) {
        let dateValue = date.split(',')
        
        if (dateValue.length === 2) {
            where['date'] = {
                [Op.between]: dateValue
            }
        } else if (dateValue.length === 1) {
            where['date'] = dateValue[0]
        } else ctx.throw(400, 'Invalid date value')
    }
    
    where['status'] = status

    // add where clause
    options['where'] = where

    // pagination
    if (!isNaN(page)) {
        if (isNaN(lessonsPerPage))
            lessonsPerPage = 5
        options['offset'] = (page - 1) * lessonsPerPage
    }
    if (!isNaN(lessonsPerPage))
        options['limit'] = lessonsPerPage
    
    let result = await Lesson.findAll(options)

    // check students count
    if (studentCount !== undefined) {
        let numStudents = studentCount.split(',')

        if (numStudents.length === 2) {
            numStudents[0] = parseInt(numStudents[0])
            numStudents[1] = parseInt(numStudents[1])

            result = result.filter(les => 
                les.dataValues.students.length >= numStudents[0] && 
                les.dataValues.students.length <= numStudents[1])
            
        } else if (numStudents.length === 1) {
            let num = parseInt(numStudents[0])
            result = result.filter(les => les.dataValues.students.length === num)
        } else ctx.throw(400,'Invalid studentsCount parameter')
    }

    console.log(result)

    // set required view
    for (let i = 0; i < result.length; i++) {
        let visitCount = 0
        for (let j = 0; j < result[i].students.length; j++) {
            let v = result[i].students[j].LessonStudent.visit
            if (v)
                visitCount++
            let st = result[i].students[j]
            st.dataValues.visit = v
            delete st.dataValues.LessonStudent
        }

        result[i].dataValues.visitCount = visitCount

        for (let j = 0; j < result[i].teachers.length; j++) {
            let te = result[i].teachers[j]
            delete te.dataValues.lesson_teachers
        }
    }

    ctx.body = result
}))

app.use(_.post('/lessons', async ctx => {

    let teachers = ctx.request.body.teacherIds,
        title = ctx.request.body.title,
        days = ctx.request.body.days,
        firstDate = ctx.request.body.firstDate,
        lessonsCount = ctx.request.body.lessonsCount,
        lastDate = ctx.request.body.lastDate

    teachers = teachers.map(t => parseInt(t))
    if (teachers.includes(NaN))
        ctx.throw(400, 'Invalid teacher ids')
    
    days = days.map(d => parseInt(d))
    if (days.includes(NaN))
        ctx.throw(400, 'Invalid days value')

    let ids = []
    if (firstDate !== undefined) {
        const startDate = new Date(firstDate)
        const YEAR = 31536000000
        const DAYSLIMIT = 300

        const associatedTeachers = await Teacher.findAll({
            where: {
                id: { 
                    [Op.or]: teachers
                }
            }
        })

        // check correct values
        if (lessonsCount !== undefined && lastDate !== undefined)
            ctx.throw(400, 'Set lessonsCount OR lastDate')
        
        // if we have lessonsCount
        if (lessonsCount !== undefined) {
            // limit
            if (lessonsCount > DAYSLIMIT)
                lessonsCount = DAYSLIMIT
            
            let currDate = startDate
            let count = 0
            while (count < lessonsCount) {
                if (currDate.getTime() - startDate.getTime() > YEAR)
                    break
                if (days.includes(currDate.getDay())) {
                    let lesson = await Lesson.create({
                        title: title,
                        status: 0,
                        date: currDate
                    })
                    if (associatedTeachers !== null)
                        lesson.addTeachers(associatedTeachers)
                    await lesson.save()
                    ids.push(lesson.get('id'))
                    count++
                }
                currDate.setDate(currDate.getDate() + 1)
            }
        } else 
        // if we have lastDate
        if (lastDate !== undefined) {
            const finishDate = new Date(lastDate)
            let ms = finishDate.getTime() - startDate.getTime()

            if (finishDate.getTime() - startDate.getTime()  < YEAR) {
                let currDate = startDate
                let count = 0
                while (currDate < finishDate) {
                    if (count > DAYSLIMIT)
                        break
                    if (days.includes(currDate.getDay())) {
                        const lesson = await Lesson.create({
                            title: title,
                            status: 0,
                            date: currDate
                        })
                        if (associatedTeachers !== null)
                            lesson.addTeachers(associatedTeachers)
                        await lesson.save()
                        ids.push(lesson.get('id'))
                        count++
                    }
                    currDate.setDate(currDate.getDate() + 1)
                }
            } else {}
        }

    } else ctx.throw(400, 'Set firstDate')
    ctx.body = ids
}))

app.on('error', (err, ctx) => {
    console.log('server error', err, ctx)
    // ctx.throw(400, 'Error 400: ' + err)
})

app.listen(3000)