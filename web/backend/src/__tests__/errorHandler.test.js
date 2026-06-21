import { jest } from '@jest/globals';
import errorHandler from '../middlewares/errorHandler.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = {};
const mockNext = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('errorHandler', () => {
  test('gère une erreur custom avec status 404', () => {
    const res = mockRes();
    errorHandler({ status: 404, message: 'Non trouvé' }, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 404,
      error: 'Not Found',
      message: 'Non trouvé'
    });
  });

  test('gère une erreur custom avec status 400', () => {
    const res = mockRes();
    errorHandler({ status: 400, message: 'Données invalides' }, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 400,
      error: 'Error',
      message: 'Données invalides'
    });
  });

  test('gère l\'erreur Prisma P2025 (enregistrement non trouvé)', () => {
    const res = mockRes();
    errorHandler({ code: 'P2025' }, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 404,
      error: 'Not Found',
      message: 'Ressource non trouvée'
    });
  });

  test('gère l\'erreur Prisma P2002 (contrainte unique)', () => {
    const res = mockRes();
    errorHandler({ code: 'P2002' }, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 409,
      error: 'Conflict',
      message: 'Cette valeur existe déjà'
    });
  });

  test('gère l\'erreur Prisma P1001 (base de données inaccessible)', () => {
    const res = mockRes();
    errorHandler({ code: 'P1001' }, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: 503,
      error: 'Database Unavailable',
      message: 'La base de donnees est inaccessible. Verifie DATABASE_URL puis redemarre le backend.'
    });
  });

  test('gère une erreur inconnue avec status 500', () => {
    const res = mockRes();
    errorHandler(new Error('Erreur inattendue'), mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 500,
      error: 'Internal Server Error',
      message: "Une erreur inattendue s'est produite"
    });
  });
});
