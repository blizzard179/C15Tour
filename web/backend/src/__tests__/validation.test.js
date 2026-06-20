import { jest } from '@jest/globals';
import { validateTrip, validateStep, validateStepUpdate, validateReorder, validateTelemetry } from '../middlewares/validation.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const runMiddleware = (middleware, body) => {
  return new Promise((resolve) => {
    const req = { body };
    const res = mockRes();
    const next = jest.fn(() => resolve({ req, res, next }));
    res.json.mockImplementation((data) => resolve({ req, res, next, data }));
    middleware(req, res, next);
  });
};

describe('validateTrip', () => {
  test('accepte un trip valide', async () => {
    const { next, res } = await runMiddleware(validateTrip, {
      trip_name: 'Convoi Test',
      trip_speed: 50,
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejette si trip_name manquant', async () => {
    const { data, res } = await runMiddleware(validateTrip, { trip_speed: 50 });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.error).toBe('Validation Failed');
    expect(data.errors['trip_name']).toBeDefined();
  });

  test('rejette si trip_name dépasse 100 caractères', async () => {
    const { data, res } = await runMiddleware(validateTrip, {
      trip_name: 'A'.repeat(101)
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['trip_name']).toBeDefined();
  });

  test('rejette si vitesse négative', async () => {
    const { data, res } = await runMiddleware(validateTrip, {
      trip_name: 'Test',
      trip_speed: -10
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['trip_speed']).toBeDefined();
  });

  test('rejette si reduction hors [0, 100]', async () => {
    const { data, res } = await runMiddleware(validateTrip, {
      trip_name: 'Test',
      trip_reduction: 150
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['trip_reduction']).toBeDefined();
  });

  test('accepte trip_nb_sections >= 1', async () => {
    const { next } = await runMiddleware(validateTrip, {
      trip_name: 'Test',
      trip_nb_sections: 3
    });
    expect(next).toHaveBeenCalled();
  });

  test('rejette trip_nb_sections < 1', async () => {
    const { data, res } = await runMiddleware(validateTrip, {
      trip_name: 'Test',
      trip_nb_sections: 0
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['trip_nb_sections']).toBeDefined();
  });
});

describe('validateStep', () => {
  const validStep = {
    step_address: '1 Rue de Paris, Paris',
    step_latitude: 48.8566,
    step_longitude: 2.3522,
  };

  test('accepte une étape valide', async () => {
    const { next } = await runMiddleware(validateStep, validStep);
    expect(next).toHaveBeenCalled();
  });

  test('rejette si step_address manquant', async () => {
    const { data, res } = await runMiddleware(validateStep, {
      step_latitude: 48.8566,
      step_longitude: 2.3522,
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['step_address']).toBeDefined();
  });

  test('rejette si latitude hors [-90, 90]', async () => {
    const { data, res } = await runMiddleware(validateStep, {
      ...validStep,
      step_latitude: 95
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['step_latitude']).toBeDefined();
  });

  test('rejette si longitude hors [-180, 180]', async () => {
    const { data, res } = await runMiddleware(validateStep, {
      ...validStep,
      step_longitude: 200
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['step_longitude']).toBeDefined();
  });

  test('rejette si durée de pause négative', async () => {
    const { data, res } = await runMiddleware(validateStep, {
      ...validStep,
      step_stop_duration: -5
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['step_stop_duration']).toBeDefined();
  });
});

describe('validateStepUpdate', () => {
  test('accepte un body vide (tout optionnel)', async () => {
    const { next } = await runMiddleware(validateStepUpdate, {});
    expect(next).toHaveBeenCalled();
  });

  test('accepte une mise à jour partielle valide', async () => {
    const { next } = await runMiddleware(validateStepUpdate, {
      step_name: 'Nouveau nom',
      step_latitude: 48.8566,
    });
    expect(next).toHaveBeenCalled();
  });

  test('rejette une latitude invalide', async () => {
    const { data, res } = await runMiddleware(validateStepUpdate, {
      step_latitude: -100
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['step_latitude']).toBeDefined();
  });
});

describe('validateReorder', () => {
  test('accepte un tableau d\'IDs valide', async () => {
    const { next } = await runMiddleware(validateReorder, { stepIds: [1, 2, 3] });
    expect(next).toHaveBeenCalled();
  });

  test('rejette si stepIds manquant', async () => {
    const { data, res } = await runMiddleware(validateReorder, {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['stepIds']).toBeDefined();
  });

  test('rejette si stepIds contient des valeurs non positives', async () => {
    const { data, res } = await runMiddleware(validateReorder, { stepIds: [1, -2, 3] });
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateTelemetry', () => {
  test('accepte une télémétrie valide', async () => {
    const { next } = await runMiddleware(validateTelemetry, {
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(next).toHaveBeenCalled();
  });

  test('rejette si latitude manquante', async () => {
    const { data, res } = await runMiddleware(validateTelemetry, {
      longitude: 2.3522
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['latitude']).toBeDefined();
  });

  test('rejette si cap hors [0, 360]', async () => {
    const { data, res } = await runMiddleware(validateTelemetry, {
      latitude: 48.8,
      longitude: 2.3,
      heading: 400
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(data.errors['heading']).toBeDefined();
  });
});
