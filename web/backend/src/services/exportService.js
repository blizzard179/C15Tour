import PDFDocument from 'pdfkit';
import prisma from '../config/database.js';


// Utilitaires pour calculer les temps
const calculateSegmentTravelTime = (trip, totalSegments) => {
  if (!trip.trip_speed || trip.trip_speed <= 0) {
    return 30;
  }

  const speedFactor = 50 / trip.trip_speed;
  let estimatedMinutes = 90 * speedFactor;

  if (trip.trip_is_reduced && trip.trip_reduction) {
    estimatedMinutes *= (1 + trip.trip_reduction / 100);
  }

  if (totalSegments > 1) {
    return Math.round(estimatedMinutes / totalSegments);
  }

  return Math.round(estimatedMinutes);
};

const getStepBreakTime = (step) => {
  if (step.step_is_stop && step.step_stop_duration) {
    return parseInt(step.step_stop_duration);
  }
  return 0;
};

const calculateWaypointTime = (trip, stepIndex, steps) => {
  if (!trip.trip_start_time || !steps || steps.length === 0) {
    return null;
  }

  try {
    if (stepIndex === 0) {
      const startDate = new Date(trip.trip_start_time);
      return formatTime(startDate);
    }

    const startDate = new Date(trip.trip_start_time);
    let totalMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const totalSegments = Math.max(1, steps.length - 1);

    for (let i = 0; i < stepIndex; i++) {
      totalMinutes += calculateSegmentTravelTime(trip, totalSegments);
    }

    for (let i = 0; i < stepIndex; i++) {
      totalMinutes += getStepBreakTime(steps[i]);
    }

    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating waypoint time:', error);
    return null;
  }
};

const calculateArrivalTime = (trip, steps) => {
  if (!trip.trip_start_time || !steps || steps.length === 0) {
    return null;
  }

  try {
    const startDate = new Date(trip.trip_start_time);
    let totalMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const totalSegments = Math.max(1, steps.length - 1);

    for (let i = 0; i < totalSegments; i++) {
      totalMinutes += calculateSegmentTravelTime(trip, totalSegments);
    }

    for (let i = 0; i < steps.length; i++) {
      totalMinutes += getStepBreakTime(steps[i]);
    }

    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating arrival time:', error);
    return null;
  }
};

const formatTime = (date) => {
  try {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return '00:00';
  }
};

// Export PDF
const exportToPDF = async (tripId, mapImageBuffer = null) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_id: parseInt(tripId) },
    include: {
      steps: {
        orderBy: { step_order: 'asc' }
      }
    }
  });

  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(20).text('C15Tour - Feuille de route', { align: 'center' });
      doc.moveDown();

      // Informations du convoi
      doc.fontSize(14).text(`Convoi: ${trip.trip_name}`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Code utilisateur: ${trip.trip_user_code}`);
      doc.text(`Code admin: ${trip.trip_admin_code}`);
      if (trip.trip_speed) {
        doc.text(`Vitesse moyenne: ${trip.trip_speed} km/h`);
      }

      const departureTime = trip.trip_start_time ? formatTime(new Date(trip.trip_start_time)) : null;
      if (departureTime) {
        doc.text(`Heure de départ: ${departureTime}`);
      }

      const arrivalTime = calculateArrivalTime(trip, trip.steps);
      if (arrivalTime) {
        doc.text(`Heure d'arrivée estimée: ${arrivalTime}`);
      }

      doc.moveDown();

      // Préférences de route
      doc.fontSize(12).text('Préférences de route:', { underline: true });
      doc.fontSize(10);
      doc.text(`Autoroute: ${trip.trip_autoroute ? 'Oui' : 'Non'}`);
      doc.text(`Voie rapide: ${trip.trip_voie_rapide ? 'Oui' : 'Non'}`);
      doc.text(`Chemin: ${trip.trip_chemin ? 'Oui' : 'Non'}`);
      doc.moveDown();

      // Liste des étapes
      doc.fontSize(12).text('Étapes:', { underline: true });
      doc.moveDown(0.5);

      const totalSegments = Math.max(1, trip.steps.length - 1);

      trip.steps.forEach((step, index) => {
        doc.fontSize(10);
        doc.text(`${index + 1}. ${step.step_name}`, { bold: true });
        doc.fontSize(9);
        doc.text(`   Adresse: ${step.step_address}`);
        doc.text(`   Coordonnées: ${step.step_latitude}, ${step.step_longitude}`);

        const waypointTime = calculateWaypointTime(trip, index, trip.steps);
        if (waypointTime) {
          doc.text(`   Arrivée: ${waypointTime}`);
        }

        if (step.step_is_stop && step.step_stop_duration) {
          doc.text(`   Pause: ${step.step_stop_duration} minutes`);
        }

        if (index < trip.steps.length - 1) {
          const travelTime = calculateSegmentTravelTime(trip, totalSegments);
          doc.text(`   Trajet: ${travelTime} minutes`);
        }

        doc.moveDown(0.5);
      });

      // Page dédiée à la carte
      if (mapImageBuffer) {
        doc.addPage();
        doc.fontSize(14).text('Carte du trajet', { align: 'center', underline: true });
        doc.moveDown(0.5);
        const margin = 40;
        const pageW = doc.page.width - margin * 2;
        const pageH = doc.page.height - doc.y - margin - 30;
        doc.image(mapImageBuffer, margin, doc.y, { fit: [pageW, pageH], align: 'center', valign: 'center' });
        // Pied de page en bas de la page carte
        doc.fontSize(8).text(
          `Généré le ${new Date().toLocaleString('fr-FR')}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      } else {
        // Pied de page sur la dernière page si pas de carte
        doc.fontSize(8).text(
          `Généré le ${new Date().toLocaleString('fr-FR')}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Export GPX
const exportToGPX = async (tripId) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_id: parseInt(tripId) },
    include: {
      steps: {
        orderBy: { step_order: 'asc' }
      }
    }
  });

  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }

  // Générer le GPX manuellement (format XML)
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
  gpx += '<gpx version="1.1" creator="C15Tour" xmlns="http://www.topografix.com/GPX/1/1">\n';
  gpx += `  <metadata>\n`;
  gpx += `    <name>${escapeXml(trip.trip_name)}</name>\n`;
  gpx += `    <time>${new Date().toISOString()}</time>\n`;
  gpx += `  </metadata>\n`;

  // Ajouter une route
  gpx += `  <rte>\n`;
  gpx += `    <name>${escapeXml(trip.trip_name)}</name>\n`;

  trip.steps.forEach((step) => {
    gpx += `    <rtept lat="${step.step_latitude}" lon="${step.step_longitude}">\n`;
    gpx += `      <name>${escapeXml(step.step_name)}</name>\n`;
    gpx += `      <desc>${escapeXml(step.step_address)}</desc>\n`;
    if (step.step_is_stop) {
      gpx += `      <type>pause</type>\n`;
    }
    gpx += `    </rtept>\n`;
  });

  gpx += `  </rte>\n`;
  gpx += '</gpx>';

  return Buffer.from(gpx, 'utf-8');
};

// Échapper les caractères spéciaux XML
const escapeXml = (text) => {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export default {
  exportToPDF,
  exportToGPX
};
