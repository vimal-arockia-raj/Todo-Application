const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const {format} = require('date-fns')

const app = express()
app.use(express.json())

const dbPath = 'todoApplication.db'
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server started at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const validateTodoFields = (request, response, next) => {
  const {status, priority, category, dueDate} = request.body

  if (status && !['TO DO', 'IN PROGRESS', 'DONE'].includes(status)) {
    response.status(400).send('Invalid Todo Status')
  } else if (priority && !['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    response.status(400).send('Invalid Todo Priority')
  } else if (category && !['WORK', 'HOME', 'LEARNING'].includes(category)) {
    response.status(400).send('Invalid Todo Category')
  } else if (dueDate && isNaN(Date.parse(dueDate))) {
    response.status(400).send('Invalid Due Date')
  } else {
    next()
  }
}

// API 1: Get Todos based on query parameters
app.get('/todos/', async (request, response) => {
  let {search_q = '', priority, status, category} = request.query
  let query = `
    SELECT id, todo, priority, status, category, due_date as dueDate 
    FROM todo 
    WHERE todo LIKE '%${search_q}%'
  `

  if (priority !== undefined) {
    query += ` AND priority = '${priority}'`
  }
  if (status !== undefined) {
    query += ` AND status = '${status}'`
  }
  if (category !== undefined) {
    query += ` AND category = '${category}'`
  }

  const todos = await db.all(query)
  response.send(todos)
})

// API 2: Get a specific Todo based on Todo ID
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const todo = await db.get(`
    SELECT id, todo, priority, status, category, due_date as dueDate 
    FROM todo 
    WHERE id = ${todoId}
  `)
  response.send(todo)
})

// API 3: Get Todos based on due date
app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const formattedDate = format(new Date(date), 'yyyy-MM-dd')
  const todos = await db.all(`
    SELECT id, todo, priority, status, category, due_date as dueDate 
    FROM todo 
    WHERE due_date = '${formattedDate}'
  `)
  response.send(todos)
})

// API 4: Create a new Todo
app.post('/todos/', validateTodoFields, async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  const formattedDate = format(new Date(dueDate), 'yyyy-MM-dd')

  const createTodoQuery = `
    INSERT INTO 
      todo (id, todo, priority, status, category, due_date) 
    VALUES 
      (${id}, '${todo}', '${priority}', '${status}', '${category}', '${formattedDate}')
  `
  await db.run(createTodoQuery)
  response.send('Todo Successfully Added')
})

// API 5: Update a specific Todo
app.put('/todos/:todoId/', validateTodoFields, async (request, response) => {
  const {todoId} = request.params
  const {todo, priority, status, category, dueDate} = request.body
  let updateQuery = 'UPDATE todo SET '
  if (todo) {
    updateQuery += `todo = '${todo}', `
  }
  if (priority) {
    updateQuery += `priority = '${priority}', `
  }
  if (status) {
    updateQuery += `status = '${status}', `
  }
  if (category) {
    updateQuery += `category = '${category}', `
  }
  if (dueDate) {
    const formattedDate = format(new Date(dueDate), 'yyyy-MM-dd')
    updateQuery += `due_date = '${formattedDate}', `
  }
  updateQuery = updateQuery.slice(0, -2) // Remove trailing comma
  updateQuery += ` WHERE id = ${todoId}`

  await db.run(updateQuery)

  let responseMessage = 'Todo Updated'
  if (todo) responseMessage = 'Todo Updated'
  else if (priority) responseMessage = 'Priority Updated'
  else if (status) responseMessage = 'Status Updated'
  else if (category) responseMessage = 'Category Updated'
  else if (dueDate) responseMessage = 'Due Date Updated'

  response.send(responseMessage)
})

// API 6: Delete a specific Todo
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  await db.run(`DELETE FROM todo WHERE id = ${todoId}`)
  response.send('Todo Deleted')
})

module.exports = app
