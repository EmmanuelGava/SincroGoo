// Tests de integración para flujos de autenticación
describe('Flujos de autenticación', () => {
  beforeEach(() => {
    cy.intercept('POST', 'https://*.supabase.co/auth/v1/token?grant_type=password', {
      statusCode: 200,
      body: {
        access_token: 'fake-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: {
          id: 'fake-user-id',
          email: 'test@example.com'
        }
      }
    }).as('loginRequest');

    cy.intercept('POST', 'https://*.supabase.co/auth/v1/signup', {
      statusCode: 200,
      body: {
        id: 'fake-user-id',
        email: 'test@example.com'
      }
    }).as('signupRequest');

    cy.intercept('POST', 'https://*.supabase.co/auth/v1/logout', {
      statusCode: 200,
      body: {}
    }).as('logoutRequest');
  });

  it('Debería cargar la página de login correctamente', () => {
    cy.visit('/auth/login');
    cy.get('h1').should('contain', 'Iniciar Sesión');
    cy.get('form').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('Debería mostrar error al intentar login con campos vacíos', () => {
    cy.visit('/auth/login');
    cy.get('button[type="submit"]').click();
    cy.get('form').should('contain', 'Campo requerido');
  });

  it('Debería iniciar sesión correctamente', () => {
    cy.visit('/auth/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    
    // Verificar redirección al dashboard después del login exitoso
    cy.url().should('include', '/dashboard');
  });

  it('Debería mostrar mensaje de error con credenciales incorrectas', () => {
    // Interceptar con respuesta de error
    cy.intercept('POST', 'https://*.supabase.co/auth/v1/token?grant_type=password', {
      statusCode: 400,
      body: {
        error: 'invalid_grant',
        error_description: 'Invalid login credentials'
      }
    }).as('loginErrorRequest');

    cy.visit('/auth/login');
    cy.get('input[type="email"]').type('wrong@example.com');
    cy.get('input[type="password"]').type('WrongPassword');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@loginErrorRequest');
    
    // Verificar mensaje de error
    cy.get('[role="alert"]').should('contain', 'Credenciales inválidas');
  });

  it('Debería cargar la página de registro correctamente', () => {
    cy.visit('/auth/register');
    cy.get('h1').should('contain', 'Crear Cuenta');
    cy.get('form').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('Debería registrar un nuevo usuario correctamente', () => {
    const email = `test${Date.now()}@example.com`;
    
    cy.visit('/auth/register');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@signupRequest');
    
    // Verificar redirección o mensaje de éxito
    cy.get('[role="status"]').should('contain', 'Cuenta creada');
  });

  it('Debería permitir navegar entre las páginas de login y registro', () => {
    // Login a registro
    cy.visit('/auth/login');
    cy.contains('Crear cuenta').click();
    cy.url().should('include', '/auth/register');
    
    // Registro a login
    cy.contains('Iniciar sesión').click();
    cy.url().should('include', '/auth/login');
  });

  it('Debería cerrar sesión correctamente', () => {
    // Simular que el usuario ya está autenticado
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'fake-token',
        refresh_token: 'fake-refresh-token',
        expires_at: Date.now() + 3600 * 1000
      }));
    });
    
    cy.visit('/dashboard');
    
    // Buscar y hacer clic en el botón de cerrar sesión
    cy.contains('Cerrar sesión').click();
    
    cy.wait('@logoutRequest');
    
    // Verificar redirección a la página principal
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('Debería cargar la página de recuperación de contraseña correctamente', () => {
    cy.visit('/auth/recuperar');
    cy.get('h1').should('contain', 'Recuperar Contraseña');
    cy.get('form').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('Debería enviar solicitud de recuperación de contraseña', () => {
    // Interceptar solicitud de recuperación
    cy.intercept('POST', 'https://*.supabase.co/auth/v1/recover', {
      statusCode: 200,
      body: {}
    }).as('recoverRequest');
    
    cy.visit('/auth/recuperar');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@recoverRequest');
    
    // Verificar mensaje de éxito
    cy.get('[role="status"]').should('contain', 'Se ha enviado un correo');
  });
}); 