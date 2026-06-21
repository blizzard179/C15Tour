import { jest } from '@jest/globals';

const mockPrisma = {
  trip: {
    findUnique: jest.fn(),
  },
  step: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  }
};

jest.unstable_mockModule('../config/database.js', () => ({ default: mockPrisma }));

const { default: stepService } = await import('../services/stepService.js');

const mockTrip = { trip_id: 1, trip_name: 'Convoi Test' };
const mockStep = {
  step_id: 1,
  step_name: 'Étape 1',
  step_address: '1 Rue de Paris',
  step_latitude: 48.8566,
  step_longitude: 2.3522,
  step_is_stop: false,
  step_stop_duration: null,
  step_order: 1,
  step_trip_id: 1,
  step_no_sections: 1
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('stepService.getStepsByTripId', () => {
  test('retourne les étapes du trip', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.step.findMany.mockResolvedValue([mockStep]);

    const result = await stepService.getStepsByTripId(1);
    expect(result).toEqual([mockStep]);
  });

  test('lève 404 si trip non trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(stepService.getStepsByTripId(99)).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });
});

describe('stepService.getStepById', () => {
  test('retourne l\'étape si trouvée', async () => {
    mockPrisma.step.findUnique.mockResolvedValue(mockStep);
    const result = await stepService.getStepById(1);
    expect(result).toEqual(mockStep);
  });

  test('lève 404 si étape non trouvée', async () => {
    mockPrisma.step.findUnique.mockResolvedValue(null);
    await expect(stepService.getStepById(99)).rejects.toEqual({
      status: 404,
      message: 'Étape non trouvée'
    });
  });
});

describe('stepService.getStopsByTripId', () => {
  test('retourne seulement les pauses', async () => {
    const stopStep = { ...mockStep, step_is_stop: true, step_stop_duration: 30 };
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.step.findMany.mockResolvedValue([stopStep]);

    const result = await stepService.getStopsByTripId(1);
    expect(result).toEqual([stopStep]);
    expect(mockPrisma.step.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ step_is_stop: true })
      })
    );
  });

  test('lève 404 si trip non trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(stepService.getStopsByTripId(99)).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });
});

describe('stepService.createStep', () => {
  test('crée une étape avec les données valides', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.step.aggregate.mockResolvedValue({ _max: { step_order: 1 } });
    mockPrisma.step.create.mockResolvedValue(mockStep);

    const data = {
      step_address: '1 Rue de Paris',
      step_latitude: 48.8566,
      step_longitude: 2.3522,
      step_is_stop: false,
    };

    const result = await stepService.createStep(1, data);
    expect(result).toEqual(mockStep);
    expect(mockPrisma.step.create).toHaveBeenCalled();
  });

  test('lève 400 si is_stop=true sans durée', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.step.aggregate.mockResolvedValue({ _max: { step_order: 0 } });

    await expect(stepService.createStep(1, {
      step_address: '1 Rue',
      step_latitude: 48.8,
      step_longitude: 2.3,
      step_is_stop: true,
      step_stop_duration: null,
    })).rejects.toEqual({
      status: 400,
      message: 'La durée de pause est obligatoire quand is_stop est true'
    });
  });

  test('lève 400 si l\'ordre existe déjà', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.step.aggregate.mockResolvedValue({ _max: { step_order: 1 } });
    mockPrisma.step.findFirst.mockResolvedValue(mockStep); // ordre déjà pris

    await expect(stepService.createStep(1, {
      step_address: '1 Rue',
      step_latitude: 48.8,
      step_longitude: 2.3,
      step_order: 1,
    })).rejects.toEqual({
      status: 400,
      message: "Une étape avec l'ordre 1 existe déjà pour ce trip"
    });
  });

  test('utilise l\'adresse comme nom si step_name absent', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.step.aggregate.mockResolvedValue({ _max: { step_order: 0 } });
    mockPrisma.step.create.mockResolvedValue(mockStep);

    await stepService.createStep(1, {
      step_address: '1 Rue de Paris',
      step_latitude: 48.8566,
      step_longitude: 2.3522,
    });

    const createCall = mockPrisma.step.create.mock.calls[0][0];
    expect(createCall.data.step_name).toBe('1 Rue de Paris');
  });

  test('lève 404 si trip non trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(stepService.createStep(99, {
      step_address: '1 Rue',
      step_latitude: 48.8,
      step_longitude: 2.3,
    })).rejects.toEqual({ status: 404, message: 'Trip non trouvé' });
  });
});

describe('stepService.deleteStep', () => {
  test('supprime une étape et réorganise les ordres', async () => {
    mockPrisma.step.findUnique.mockResolvedValue(mockStep);
    mockPrisma.step.delete.mockResolvedValue(mockStep);
    mockPrisma.step.updateMany.mockResolvedValue({ count: 1 });

    const result = await stepService.deleteStep(1);
    expect(result).toEqual({ message: 'Étape supprimée' });
    expect(mockPrisma.step.delete).toHaveBeenCalledWith({ where: { step_id: 1 } });
    expect(mockPrisma.step.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { step_order: { decrement: 1 } }
      })
    );
  });

  test('lève 404 si étape non trouvée', async () => {
    mockPrisma.step.findUnique.mockResolvedValue(null);
    await expect(stepService.deleteStep(99)).rejects.toEqual({
      status: 404,
      message: 'Étape non trouvée'
    });
  });
});

describe('stepService.reorderSteps', () => {
  test('réordonne les étapes', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
    mockPrisma.step.update.mockResolvedValue(mockStep);
    mockPrisma.step.findMany.mockResolvedValue([mockStep]);
    // getStepsByTripId appelle trip.findUnique aussi
    mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);

    await stepService.reorderSteps(1, [1, 2, 3]);
    expect(mockPrisma.step.update).toHaveBeenCalledTimes(3);
  });

  test('lève 404 si trip non trouvé', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(stepService.reorderSteps(99, [1, 2])).rejects.toEqual({
      status: 404,
      message: 'Trip non trouvé'
    });
  });
});
