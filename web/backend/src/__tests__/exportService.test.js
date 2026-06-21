import { jest } from '@jest/globals';

const mockPrisma = {
  trip: {
    findUnique: jest.fn(),
  }
};

// Mock PDFDocument
const mockDoc = {
  on: jest.fn(),
  fontSize: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveDown: jest.fn().mockReturnThis(),
  image: jest.fn().mockReturnThis(),
  addPage: jest.fn().mockReturnThis(),
  end: jest.fn(),
  page: { width: 595, height: 842, margins: { left: 50, right: 50 } },
  y: 100,
};

jest.unstable_mockModule('../config/database.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('pdfkit', () => ({
  default: jest.fn(() => mockDoc)
}));

const { default: exportService } = await import('../services/exportService.js');

const mockTrip = {
  trip_id: 1,
  trip_name: 'Convoi Test',
  trip_user_code: 'ABC123',
  trip_admin_code: 'ADMIN123',
  trip_speed: 50,
  trip_start_time: new Date('2024-01-01T08:00:00Z'),
  trip_autoroute: true,
  trip_voie_rapide: true,
  trip_chemin: false,
  trip_is_reduced: false,
  trip_reduction: 0,
  steps: [
    {
      step_id: 1,
      step_name: 'Départ',
      step_address: '1 Rue du Départ, Paris',
      step_latitude: 48.8566,
      step_longitude: 2.3522,
      step_is_stop: false,
      step_stop_duration: null,
      step_order: 1
    },
    {
      step_id: 2,
      step_name: 'Arrivée',
      step_address: '2 Rue d\'Arrivée, Lyon',
      step_latitude: 45.7640,
      step_longitude: 4.8357,
      step_is_stop: false,
      step_stop_duration: null,
      step_order: 2
    }
  ]
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.on.mockImplementation((event, cb) => {
    if (event === 'end') setTimeout(cb, 0);
    return mockDoc;
  });
  mockDoc.end.mockImplementation(() => {
    const endCb = mockDoc.on.mock.calls.find(c => c[0] === 'end')?.[1];
    if (endCb) endCb();
  });
});

describe('exportService.exportToPDF', () => {
  test('lève 404 si le trip n\'existe pas', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(exportService.exportToPDF(99)).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });

  test('génère un PDF sans erreur pour un trip valide', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockDoc.on.mockImplementation((event, cb) => {
      if (event === 'data') cb(Buffer.from('chunk'));
      if (event === 'end') setTimeout(cb, 10);
      return mockDoc;
    });

    const result = await exportService.exportToPDF(1);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(mockDoc.text).toHaveBeenCalledWith('C15Tour - Feuille de route', { align: 'center' });
  });

  test('inclut l\'image de carte si fournie', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockDoc.on.mockImplementation((event, cb) => {
      if (event === 'data') cb(Buffer.from('chunk'));
      if (event === 'end') setTimeout(cb, 10);
      return mockDoc;
    });

    const fakeImage = Buffer.from('fake-png-data');
    await exportService.exportToPDF(1, fakeImage);
    expect(mockDoc.addPage).toHaveBeenCalled();
    expect(mockDoc.image).toHaveBeenCalledWith(fakeImage, expect.any(Number), expect.any(Number), expect.any(Object));
  });

  test('n\'ajoute pas de page carte si mapImageBuffer est null', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockDoc.on.mockImplementation((event, cb) => {
      if (event === 'data') cb(Buffer.from('chunk'));
      if (event === 'end') setTimeout(cb, 10);
      return mockDoc;
    });

    await exportService.exportToPDF(1, null);
    expect(mockDoc.addPage).not.toHaveBeenCalled();
  });
});

describe('exportService.exportToGPX', () => {
  test('lève 404 si le trip n\'existe pas', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(exportService.exportToGPX(99)).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });

  test('génère un fichier GPX valide', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    const result = await exportService.exportToGPX(1);
    expect(Buffer.isBuffer(result)).toBe(true);
    const gpxString = result.toString('utf-8');
    expect(gpxString).toContain('<?xml version="1.0"');
    expect(gpxString).toContain('<gpx');
    expect(gpxString).toContain('Convoi Test');
    expect(gpxString).toContain('<rtept');
  });

  test('inclut toutes les étapes dans le GPX', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    const result = await exportService.exportToGPX(1);
    const gpxString = result.toString('utf-8');
    expect(gpxString).toContain('Départ');
    expect(gpxString).toContain('Arrivée');
    expect(gpxString).toContain('48.8566');
    expect(gpxString).toContain('4.8357');
  });
});
