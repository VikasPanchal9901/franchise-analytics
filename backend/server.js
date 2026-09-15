require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const outletsRoutes = require('./routes/outlets');
const inventoryRoutes = require('./routes/inventory');
const staffRoutes = require('./routes/staff');
const marketingRoutes = require('./routes/marketing');
const salesRoutes = require('./routes/sales');
const auditRoutes = require('./routes/audit');
const notificationsRoutes = require('./routes/notifications');
const executiveRoutes = require('./routes/executive');
const dataSourcesRoutes = require('./routes/dataSources');
const { initRealtime } = require('./realtime');

const app = express();
const server = http.createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, { cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] } });
app.set('io', io);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'franchiseops-backend', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/outlets', outletsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/executive', executiveRoutes);
app.use('/api/data-sources', dataSourcesRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

io.on('connection', (socket) => {
  socket.emit('connected', { message: 'Live updates connected.' });
});

const stopRealtime = initRealtime(io);
process.on('SIGINT', () => { stopRealtime(); process.exit(0); });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`FranchiseOps API + realtime engine running on http://localhost:${PORT}`);
});
