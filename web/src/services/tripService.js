const prisma = require('../config/database');

// Générer un code aléatoire
const generateCode = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Générer un code unique
const generateUniqueCode = async (length, isUserCode) => {
  let code;
  let exists = true;
  
  while (exists) {
    code = generateCode(length);
    const trip = isUserCode 
      ? await prisma.trip.findUnique({ where: { trip_user_code: code } })
      : await prisma.trip.findUnique({ where: { trip_admin_code: code } });
    exists = !!trip;
  }
  
  return code;
};

// Récupérer tous les trips
const getAllTrips = async () => {
  return prisma.trip.findMany({
    orderBy: { trip_update_at: 'desc' },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
};

// Récupérer un trip par ID
const getTripById = async (id) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_id: parseInt(id) },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
  
  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }
  
  return trip;
};

// Récupérer le dernier trip
const getLastTrip = async () => {
  const trip = await prisma.trip.findFirst({
    orderBy: { trip_created_at: 'desc' },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
  
  if (!trip) {
    throw { status: 404, message: 'Aucun trip trouvé' };
  }
  
  return trip;
};

// Récupérer un trip par code utilisateur
const getTripByUserCode = async (userCode) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_user_code: userCode },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
  
  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé avec ce code' };
  }
  
  return trip;
};

// Récupérer un trip par code admin
const getTripByAdminCode = async (adminCode) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_admin_code: adminCode },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
  
  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé avec ce code admin' };
  }
  
  return trip;
};

// Créer un trip
const createTrip = async (data) => {
  const userCode = await generateUniqueCode(6, true);
  const adminCode = await generateUniqueCode(8, false);
  
  return prisma.trip.create({
    data: {
      trip_name: data.trip_name,
      trip_speed: data.trip_speed,
      trip_start_time: data.trip_start_time ? new Date(data.trip_start_time) : null,
      trip_autoroute: data.trip_autoroute ?? true,
      trip_voie_rapide: data.trip_voie_rapide ?? true,
      trip_chemin: data.trip_chemin ?? false,
      trip_is_reduced: data.trip_is_reduced ?? false,
      trip_reduction: data.trip_reduction ?? 0,
      trip_user_code: userCode,
      trip_admin_code: adminCode
    },
    include: { steps: true }
  });
};

// Modifier un trip
const updateTrip = async (id, data) => {
  // Vérifier que le trip existe
  await getTripById(id);
  
  return prisma.trip.update({
    where: { trip_id: parseInt(id) },
    data: {
      trip_name: data.trip_name,
      trip_speed: data.trip_speed,
      trip_start_time: data.trip_start_time ? new Date(data.trip_start_time) : undefined,
      trip_autoroute: data.trip_autoroute,
      trip_voie_rapide: data.trip_voie_rapide,
      trip_chemin: data.trip_chemin,
      trip_is_reduced: data.trip_is_reduced,
      trip_reduction: data.trip_reduction
    },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
};

// Supprimer un trip
const deleteTrip = async (id) => {
  await getTripById(id);
  return prisma.trip.delete({ where: { trip_id: parseInt(id) } });
};

// Régénérer le code utilisateur
const regenerateUserCode = async (id) => {
  await getTripById(id);
  const newCode = await generateUniqueCode(6, true);
  
  return prisma.trip.update({
    where: { trip_id: parseInt(id) },
    data: { trip_user_code: newCode },
    include: { steps: { orderBy: { step_order: 'asc' } } }
  });
};

// Rechercher des trips par nom
const searchTripsByName = async (name) => {
  return prisma.trip.findMany({
    where: {
      trip_name: { contains: name }
    },
    orderBy: { trip_update_at: 'desc' }
  });
};

module.exports = {
  getAllTrips,
  getTripById,
  getLastTrip,
  getTripByUserCode,
  getTripByAdminCode,
  createTrip,
  updateTrip,
  deleteTrip,
  regenerateUserCode,
  searchTripsByName
};
