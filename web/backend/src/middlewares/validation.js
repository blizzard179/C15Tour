import Joi from 'joi';

// Validation pour créer/modifier un Trip
const tripSchema = Joi.object({
  trip_name: Joi.string().max(100).required().messages({
    'string.empty': 'Le nom du convoi est obligatoire',
    'string.max': 'Le nom ne peut pas dépasser 100 caractères',
    'any.required': 'Le nom du convoi est obligatoire'
  }),
  trip_speed: Joi.number().positive().allow(null).messages({
    'number.positive': 'La vitesse doit être positive'
  }),
  trip_start_time: Joi.date().iso().allow(null),
  trip_autoroute: Joi.boolean().default(false),
  trip_voie_rapide: Joi.boolean().default(true),
  trip_chemin: Joi.boolean().default(true),
  trip_is_reduced: Joi.boolean().default(false),
  trip_reduction: Joi.number().min(0).max(100).default(0).messages({
    'number.min': 'La réduction doit être entre 0 et 100',
    'number.max': 'La réduction doit être entre 0 et 100'
  }),
  trip_nb_sections: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Le nombre de segments doit être un nombre',
    'number.integer': 'Le nombre de segments doit être un entier',
    'number.min': 'Le nombre de segments doit être supérieur ou égal à 1'
  })
});

// Validation pour créer un Step
const stepSchema = Joi.object({
  step_name: Joi.string().max(100).allow('', null).optional().messages({
    'string.max': 'Le nom ne peut pas dépasser 100 caractères'
  }),
  step_address: Joi.string().max(255).required().messages({
    'string.empty': "L'adresse de l'étape est obligatoire",
    'string.max': 'L\'adresse ne peut pas dépasser 255 caractères',
    'any.required': "L'adresse de l'étape est obligatoire"
  }),
  step_latitude: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'La latitude doit être entre -90 et 90',
    'number.max': 'La latitude doit être entre -90 et 90',
    'any.required': 'La latitude est obligatoire'
  }),
  step_longitude: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'La longitude doit être entre -180 et 180',
    'number.max': 'La longitude doit être entre -180 et 180',
    'any.required': 'La longitude est obligatoire'
  }),
  step_is_stop: Joi.boolean().default(false),
  step_stop_duration: Joi.number().min(0).allow(null).messages({
    'number.min': 'La durée de pause doit être positive ou nulle'
  }),
  step_order: Joi.number().positive().allow(null),
  step_no_sections: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Le nombre de segments doit etre un nombre',
    'number.integer': 'Le nombre de segments doit etre un entier',
    'number.min': 'Le nombre de segments doit etre superieur ou egal a 1'
  })
});

// Validation pour modifier un Step (tout est optionnel)
const stepUpdateSchema = Joi.object({
  step_name: Joi.string().max(100).allow('', null).optional().messages({
    'string.max': 'Le nom ne peut pas dépasser 100 caractères'
  }),
  step_address: Joi.string().max(255).optional().messages({
    'string.max': 'L\'adresse ne peut pas dépasser 255 caractères'
  }),
  step_latitude: Joi.number().min(-90).max(90).optional().messages({
    'number.min': 'La latitude doit être entre -90 et 90',
    'number.max': 'La latitude doit être entre -90 et 90'
  }),
  step_longitude: Joi.number().min(-180).max(180).optional().messages({
    'number.min': 'La longitude doit être entre -180 et 180',
    'number.max': 'La longitude doit être entre -180 et 180'
  }),
  step_is_stop: Joi.boolean().optional(),
  step_stop_duration: Joi.number().min(0).allow(null).optional().messages({
    'number.min': 'La durée de pause doit être positive ou nulle'
  }),
  step_order: Joi.number().positive().allow(null).optional(),
  step_no_sections: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Le nombre de segments doit etre un nombre',
    'number.integer': 'Le nombre de segments doit etre un entier',
    'number.min': 'Le nombre de segments doit etre superieur ou egal a 1'
  })
});

// Validation pour réorganiser les étapes
const reorderSchema = Joi.object({
  stepIds: Joi.array().items(Joi.number().positive()).required().messages({
    'any.required': 'La liste des IDs est obligatoire'
  })
});

// Validation pour la télémétrie
const telemetrySchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'La latitude doit être entre -90 et 90',
    'number.max': 'La latitude doit être entre -90 et 90',
    'any.required': 'La latitude est obligatoire'
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'La longitude doit être entre -180 et 180',
    'number.max': 'La longitude doit être entre -180 et 180',
    'any.required': 'La longitude est obligatoire'
  }),
  speed: Joi.number().min(0).allow(null).messages({
    'number.min': 'La vitesse doit être positive'
  }),
  heading: Joi.number().min(0).max(360).allow(null).messages({
    'number.min': 'Le cap doit être entre 0 et 360',
    'number.max': 'Le cap doit être entre 0 et 360'
  }),
  timestamp: Joi.date().iso().allow(null),
  step_no_sections: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Le nombre de segments doit etre un nombre',
    'number.integer': 'Le nombre de segments doit etre un entier',
    'number.min': 'Le nombre de segments doit etre superieur ou egal a 1'
  })
});

// Fabrique de middleware Express : valide le corps de la requête selon le schéma
// Joi fourni. En cas d'erreur, renvoie un 400 avec un message par champ en faute
// (abortEarly: false pour collecter toutes les erreurs, pas seulement la première).
// En cas de succès, remplace req.body par la valeur validée/normalisée (valeurs par défaut appliquées).
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {});

      return res.status(400).json({
        status: 400,
        error: 'Validation Failed',
        errors
      });
    }

    req.body = value;
    next();
  };
};

export const validateTrip = validate(tripSchema);
export const validateStep = validate(stepSchema);
export const validateStepUpdate = validate(stepUpdateSchema);
export const validateReorder = validate(reorderSchema);
export const validateTelemetry = validate(telemetrySchema);
