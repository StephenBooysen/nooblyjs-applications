module.exports = function createWarehouseApplication(options, eventEmitter, serviceRegistry) {
    const app = {
        name: 'warehouse',
        version: '1.0.0',
        
        log: serviceRegistry.logger('console'),
        cache: serviceRegistry.cache('memory'),
        dataserve: serviceRegistry.dataServe('memory'),
        
        initialize() {
            this.setupRoutes();
            this.registerEventHandlers();
        },
        
        setupRoutes() {
            const routes = require('./routes/index')(options, eventEmitter, serviceRegistry);
            options['express-app'].use('/applications/warehouse', routes);
        },

        registerEventHandlers() {
            // eventEmitter.on('some-event', () => {});
        }
    };
    
    app.initialize();
    return app;
};