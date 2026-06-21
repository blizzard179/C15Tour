import { jest } from '@jest/globals';

// Mock prisma
const mockPrisma = {
  trip: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
};

jest.unstable_mockModule('../config/database.js', () => ({ default: mockPrisma }));

const { default: tripService } = await import('../services/tripService.js');

const mockTrip = {
  trip_id: 1,
  trip_name: 'Convoi Test',
  trip_speed: 50,
  trip_user_code: 'ABC123',
  trip_admin_code: 'ADMIN123',
  trip_autoroute: true,
  trip_voie_rapide: true,
  trip_chemin: false,
  trip_is_reduced: false,
  trip_reduction: 0,
  trip_nb_sections: 1,
  trip_start_time: null,
  steps: []
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('tripService.getAllTrips', () => {
  test('retourne tous les trips', async () => {
    mockPrisma.trip.findMany.mockResolvedValue([mockTrip]);
    const result = await tripService.getAllTrips();
    expect(result).toEqual([mockTrip]);
    expect(mockPrisma.trip.findMany).toHaveBeenCalledWith({
      orderBy: { trip_updated_at: 'desc' },
      include: { steps: { orderBy: { step_order: 'asc' } } }
    });
  });

  test('retourne un tableau vide si aucun trip', async () => {
    mockPrisma.trip.findMany.mockResolvedValue([]);
    const result = await tripService.getAllTrips();
    expect(result).toEqual([]);
  });
});

describe('tripService.getTripById', () => {
  test('retourne le trip si trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    const result = await tripService.getTripById(1);
    expect(result).toEqual(mockTrip);
  });

  test('lève une erreur 404 si trip non trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(tripService.getTripById(99)).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });
});

describe('tripService.getLastTrip', () => {
  test('retourne le dernier trip', async () => {
    mockPrisma.trip.findFirst.mockResolvedValue(mockTrip);
    const result = await tripService.getLastTrip();
    expect(result).toEqual(mockTrip);
  });

  test('lève une erreur 404 si aucun trip', async () => {
    mockPrisma.trip.findFirst.mockResolvedValue(null);
    await expect(tripService.getLastTrip()).rejects.toEqual({
      status: 404,
      message: 'Aucun trip trouvé'
    });
  });
});

describe('tripService.getTripByUserCode', () => {
  test('retourne le trip avec le bon code utilisateur', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    const result = await tripService.getTripByUserCode('ABC123');
    expect(result).toEqual(mockTrip);
  });

  test('lève une erreur 404 si code non trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(tripService.getTripByUserCode('XXXXX')).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé avec ce code'
    });
  });
});

describe('tripService.getTripByAdminCode', () => {
  test('retourne le trip avec le bon code admin', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    const result = await tripService.getTripByAdminCode('ADMIN123');
    expect(result).toEqual(mockTrip);
  });

  test('lève une erreur 404 si code admin non trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(tripService.getTripByAdminCode('XXXXXXXX')).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé avec ce code admin'
    });
  });
});

describe('tripService.createTrip', () => {
  test('crée un trip avec les données valides', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null); // codes uniques disponibles
    mockPrisma.trip.create.mockResolvedValue({ ...mockTrip, trip_id: 2 });

    const data = {
      trip_name: 'Nouveau convoi',
      trip_speed: 50,
      trip_is_reduced: false,
    };

    const result = await tripService.createTrip(data);
    expect(result.trip_id).toBe(2);
    expect(mockPrisma.trip.create).toHaveBeenCalled();
  });

  test('lève une erreur 400 si is_reduced=true sans reduction', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    const data = {
      trip_name: 'Convoi réduit',
      trip_is_reduced: true,
      trip_reduction: 0,
    };
    await expect(tripService.createTrip(data)).rejects.toEqual({
      status: 400,
      message: 'Le taux de réduction est obligatoire quand is_reduced est true'
    });
  });

  test('remet reduction à 0 si is_reduced=false', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    mockPrisma.trip.create.mockResolvedValue(mockTrip);

    await tripService.createTrip({
      trip_name: 'Convoi',
      trip_is_reduced: false,
      trip_reduction: 20,
    });

    const createCall = mockPrisma.trip.create.mock.calls[0][0];
    expect(createCall.data.trip_reduction).toBe(0);
  });
});

describe('tripService.updateTrip', () => {
  test('met à jour un trip existant', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.trip.update.mockResolvedValue({ ...mockTrip, trip_name: 'Nouveau nom' });

    const result = await tripService.updateTrip(1, { trip_name: 'Nouveau nom' });
    expect(result.trip_name).toBe('Nouveau nom');
  });

  test('lève 404 si le trip n\'existe pas', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(tripService.updateTrip(99, { trip_name: 'X' })).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });
});

describe('tripService.deleteTrip', () => {
  test('supprime un trip existant', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.trip.delete.mockResolvedValue(mockTrip);

    const result = await tripService.deleteTrip(1);
    expect(mockPrisma.trip.delete).toHaveBeenCalledWith({ where: { trip_id: 1 } });
  });

  test('lève 404 si le trip n\'existe pas', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(tripService.deleteTrip(99)).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });
});

describe('tripService.searchTripsByName', () => {
  test('retourne les trips correspondant au nom', async () => {
    mockPrisma.trip.findMany.mockResolvedValue([mockTrip]);
    const result = await tripService.searchTripsByName('Test');
    expect(result).toEqual([mockTrip]);
    expect(mockPrisma.trip.findMany).toHaveBeenCalledWith({
      where: { trip_name: { contains: 'Test' } },
      orderBy: { trip_updated_at: 'desc' }
    });
  });
});

describe('tripService.regenerateUserCode', () => {
  test('régénère le code utilisateur', async () => {
    mockPrisma.trip.findUnique
      .mockResolvedValueOnce(mockTrip)  // getTripById
      .mockResolvedValue(null);          // generateUniqueCode (code disponible)
    mockPrisma.trip.update.mockResolvedValue({ ...mockTrip, trip_user_code: 'NEWCOD' });

    const result = await tripService.regenerateUserCode(1);
    expect(mockPrisma.trip.update).toHaveBeenCalled();
  });

  test('lève 404 si le trip n\'existe pas', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(tripService.regenerateUserCode(99)).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });
});
