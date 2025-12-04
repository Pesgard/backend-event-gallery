import { PrismaClient, EventCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Función para generar código de invitación
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Función para generar fecha aleatoria en el futuro o pasado
function randomDate(daysOffset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

async function main() {
  console.log('🌱 Starting seed...\n');

  // Limpiar base de datos (en orden por las relaciones)
  console.log('🗑️  Cleaning database...');
  await prisma.comment.deleteMany();
  await prisma.imageLike.deleteMany();
  await prisma.image.deleteMany();
  await prisma.eventParticipant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // ==========================================
  // CREAR USUARIOS
  // ==========================================
  console.log('\n👤 Creating users...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@eventgallery.com',
        username: 'admin',
        passwordHash,
        fullName: 'Administrador',
        avatarUrl: 'https://i.pravatar.cc/150?u=admin',
      },
    }),
    prisma.user.create({
      data: {
        email: 'maria@example.com',
        username: 'maria_garcia',
        passwordHash,
        fullName: 'María García',
        avatarUrl: 'https://i.pravatar.cc/150?u=maria',
      },
    }),
    prisma.user.create({
      data: {
        email: 'carlos@example.com',
        username: 'carlos_lopez',
        passwordHash,
        fullName: 'Carlos López',
        avatarUrl: 'https://i.pravatar.cc/150?u=carlos',
      },
    }),
    prisma.user.create({
      data: {
        email: 'ana@example.com',
        username: 'ana_martinez',
        passwordHash,
        fullName: 'Ana Martínez',
        avatarUrl: 'https://i.pravatar.cc/150?u=ana',
      },
    }),
    prisma.user.create({
      data: {
        email: 'pedro@example.com',
        username: 'pedro_sanchez',
        passwordHash,
        fullName: 'Pedro Sánchez',
        avatarUrl: 'https://i.pravatar.cc/150?u=pedro',
      },
    }),
    prisma.user.create({
      data: {
        email: 'laura@example.com',
        username: 'laura_fernandez',
        passwordHash,
        fullName: 'Laura Fernández',
        avatarUrl: 'https://i.pravatar.cc/150?u=laura',
      },
    }),
  ]);

  console.log(`   ✅ Created ${users.length} users`);

  // ==========================================
  // CREAR EVENTOS
  // ==========================================
  console.log('\n📅 Creating events...');

  const eventsData = [
    {
      name: 'Boda de María y Carlos',
      description: 'Celebración del matrimonio de María García y Carlos López. Una noche mágica llena de amor, música y buenos momentos. ¡Todos los invitados están invitados a compartir sus fotos!',
      category: EventCategory.wedding,
      location: 'Hacienda Los Rosales, Guadalajara',
      date: randomDate(-30),
      time: '18:00',
      isPrivate: true,
      coverImageUrl: 'https://picsum.photos/seed/wedding1/1200/600',
      creatorIndex: 1, // María
    },
    {
      name: 'Cumpleaños de Pedro - 30 años',
      description: '¡Pedro cumple 30! Únete a la celebración y comparte tus mejores fotos de la fiesta.',
      category: EventCategory.birthday,
      location: 'Club Social El Mirador',
      date: randomDate(-15),
      time: '20:00',
      isPrivate: false,
      coverImageUrl: 'https://picsum.photos/seed/birthday1/1200/600',
      creatorIndex: 4, // Pedro
    },
    {
      name: 'Tech Conference 2024',
      description: 'Conferencia anual de tecnología con speakers internacionales. Comparte tus momentos favoritos del evento.',
      category: EventCategory.conference,
      location: 'Centro de Convenciones, CDMX',
      date: randomDate(-7),
      time: '09:00',
      isPrivate: false,
      coverImageUrl: 'https://picsum.photos/seed/tech1/1200/600',
      creatorIndex: 0, // Admin
    },
    {
      name: 'Concierto Rock en Vivo',
      description: 'Noche de rock con las mejores bandas locales. ¡Sube tus fotos y videos del concierto!',
      category: EventCategory.music,
      location: 'Foro Sol, CDMX',
      date: randomDate(-3),
      time: '21:00',
      isPrivate: false,
      coverImageUrl: 'https://picsum.photos/seed/concert1/1200/600',
      creatorIndex: 2, // Carlos
    },
    {
      name: 'Maratón Ciudad de México',
      description: 'Edición 2024 del maratón de la ciudad. Comparte tus fotos de la carrera.',
      category: EventCategory.sports,
      location: 'Paseo de la Reforma',
      date: randomDate(-1),
      time: '07:00',
      isPrivate: false,
      coverImageUrl: 'https://picsum.photos/seed/marathon1/1200/600',
      creatorIndex: 3, // Ana
    },
    {
      name: 'Exposición de Arte Moderno',
      description: 'Muestra de artistas contemporáneos en el museo de la ciudad.',
      category: EventCategory.art,
      location: 'Museo de Arte Moderno',
      date: randomDate(7),
      time: '10:00',
      isPrivate: false,
      coverImageUrl: 'https://picsum.photos/seed/art1/1200/600',
      creatorIndex: 5, // Laura
    },
    {
      name: 'Reunión Anual Corporativa',
      description: 'Evento privado de la empresa. Solo empleados.',
      category: EventCategory.corporate,
      location: 'Hotel Hilton, Monterrey',
      date: randomDate(14),
      time: '15:00',
      isPrivate: true,
      coverImageUrl: 'https://picsum.photos/seed/corporate1/1200/600',
      creatorIndex: 0, // Admin
    },
    {
      name: 'Festival Gastronómico',
      description: 'Degustación de comida local e internacional. ¡Comparte tus platillos favoritos!',
      category: EventCategory.other,
      location: 'Plaza Principal, Oaxaca',
      date: randomDate(21),
      time: '12:00',
      isPrivate: false,
      coverImageUrl: 'https://picsum.photos/seed/food1/1200/600',
      creatorIndex: 1, // María
    },
  ];

  const events = await Promise.all(
    eventsData.map((eventData) =>
      prisma.event.create({
        data: {
          name: eventData.name,
          description: eventData.description,
          category: eventData.category,
          location: eventData.location,
          date: eventData.date,
          time: eventData.time,
          isPrivate: eventData.isPrivate,
          coverImageUrl: eventData.coverImageUrl,
          inviteCode: generateInviteCode(),
          createdById: users[eventData.creatorIndex].id,
        },
      })
    )
  );

  console.log(`   ✅ Created ${events.length} events`);

  // ==========================================
  // AGREGAR PARTICIPANTES A EVENTOS
  // ==========================================
  console.log('\n👥 Adding participants to events...');

  const participantsData: { eventIndex: number; userIndices: number[] }[] = [
    { eventIndex: 0, userIndices: [0, 2, 3, 4, 5] }, // Boda - todos menos María (creadora)
    { eventIndex: 1, userIndices: [0, 1, 2, 3, 5] }, // Cumpleaños - todos menos Pedro (creador)
    { eventIndex: 2, userIndices: [1, 2, 3, 4, 5] }, // Tech Conference
    { eventIndex: 3, userIndices: [0, 1, 3, 4, 5] }, // Concierto
    { eventIndex: 4, userIndices: [0, 1, 2, 4, 5] }, // Maratón
    { eventIndex: 5, userIndices: [0, 1, 2, 3, 4] }, // Exposición
    { eventIndex: 6, userIndices: [1, 2, 3] }, // Corporativo (privado, menos participantes)
    { eventIndex: 7, userIndices: [0, 2, 3, 4, 5] }, // Festival
  ];

  let participantCount = 0;
  for (const { eventIndex, userIndices } of participantsData) {
    for (const userIndex of userIndices) {
      await prisma.eventParticipant.create({
        data: {
          eventId: events[eventIndex].id,
          userId: users[userIndex].id,
        },
      });
      participantCount++;
    }
  }

  console.log(`   ✅ Added ${participantCount} participants`);

  // ==========================================
  // CREAR IMÁGENES
  // ==========================================
  console.log('\n📷 Creating images...');

  const imagesData: {
    eventIndex: number;
    userIndex: number;
    title: string;
    description: string;
    seed: string;
  }[] = [
    // Boda (evento 0)
    { eventIndex: 0, userIndex: 2, title: 'La ceremonia', description: 'Momento emotivo del intercambio de votos', seed: 'wedding-ceremony' },
    { eventIndex: 0, userIndex: 3, title: 'El primer baile', description: 'María y Carlos bailando su primera pieza como casados', seed: 'wedding-dance' },
    { eventIndex: 0, userIndex: 4, title: 'Brindis', description: 'Todos brindando por los novios', seed: 'wedding-toast' },
    { eventIndex: 0, userIndex: 5, title: 'El pastel', description: 'Los novios cortando el pastel', seed: 'wedding-cake' },
    { eventIndex: 0, userIndex: 0, title: 'Foto grupal', description: 'Todos los invitados juntos', seed: 'wedding-group' },

    // Cumpleaños (evento 1)
    { eventIndex: 1, userIndex: 1, title: 'Soplando las velas', description: '¡30 velas!', seed: 'birthday-candles' },
    { eventIndex: 1, userIndex: 2, title: 'La sorpresa', description: 'Pedro no se lo esperaba', seed: 'birthday-surprise' },
    { eventIndex: 1, userIndex: 3, title: 'Con los amigos', description: 'Foto con el grupo de siempre', seed: 'birthday-friends' },
    { eventIndex: 1, userIndex: 5, title: 'El regalo', description: 'Abriendo los regalos', seed: 'birthday-gift' },

    // Tech Conference (evento 2)
    { eventIndex: 2, userIndex: 1, title: 'Keynote principal', description: 'El speaker hablando sobre IA', seed: 'tech-keynote' },
    { eventIndex: 2, userIndex: 2, title: 'Networking', description: 'Conociendo gente nueva', seed: 'tech-networking' },
    { eventIndex: 2, userIndex: 3, title: 'Demo de producto', description: 'Presentación del nuevo software', seed: 'tech-demo' },
    { eventIndex: 2, userIndex: 4, title: 'Workshop', description: 'Taller práctico de desarrollo', seed: 'tech-workshop' },
    { eventIndex: 2, userIndex: 5, title: 'Stands de empresas', description: 'Recorriendo los stands', seed: 'tech-stands' },

    // Concierto (evento 3)
    { eventIndex: 3, userIndex: 0, title: 'El escenario', description: 'Vista increíble del escenario', seed: 'concert-stage' },
    { eventIndex: 3, userIndex: 1, title: 'La banda tocando', description: 'Momento épico del solo de guitarra', seed: 'concert-band' },
    { eventIndex: 3, userIndex: 3, title: 'El público', description: 'Miles de personas cantando', seed: 'concert-crowd' },
    { eventIndex: 3, userIndex: 4, title: 'Luces del show', description: 'Espectáculo de luces increíble', seed: 'concert-lights' },

    // Maratón (evento 4)
    { eventIndex: 4, userIndex: 0, title: 'La salida', description: 'Momento de la salida', seed: 'marathon-start' },
    { eventIndex: 4, userIndex: 1, title: 'En plena carrera', description: 'Kilómetro 21', seed: 'marathon-running' },
    { eventIndex: 4, userIndex: 2, title: 'Cruzando la meta', description: '¡Lo logré!', seed: 'marathon-finish' },
    { eventIndex: 4, userIndex: 5, title: 'Con la medalla', description: 'Celebrando el logro', seed: 'marathon-medal' },

    // Exposición de Arte (evento 5)
    { eventIndex: 5, userIndex: 0, title: 'Obra principal', description: 'La pieza central de la exposición', seed: 'art-main' },
    { eventIndex: 5, userIndex: 1, title: 'Escultura moderna', description: 'Increíble trabajo en metal', seed: 'art-sculpture' },
    { eventIndex: 5, userIndex: 2, title: 'Pintura abstracta', description: 'Colores vibrantes', seed: 'art-painting' },
    { eventIndex: 5, userIndex: 3, title: 'Instalación', description: 'Arte interactivo', seed: 'art-installation' },
  ];

  const images = await Promise.all(
    imagesData.map((imgData, index) =>
      prisma.image.create({
        data: {
          eventId: events[imgData.eventIndex].id,
          userId: users[imgData.userIndex].id,
          title: imgData.title,
          description: imgData.description,
          imageUrl: `https://picsum.photos/seed/${imgData.seed}/1200/800`,
          imageKey: `events/${events[imgData.eventIndex].id}/${imgData.seed}.jpg`,
          thumbnailUrl: `https://picsum.photos/seed/${imgData.seed}/400/300`,
          thumbnailKey: `events/${events[imgData.eventIndex].id}/thumb-${imgData.seed}.jpg`,
          width: 1200,
          height: 800,
          fileSize: Math.floor(Math.random() * 500000) + 100000,
          mimeType: 'image/jpeg',
          uploadedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Últimos 7 días
        },
      })
    )
  );

  console.log(`   ✅ Created ${images.length} images`);

  // ==========================================
  // AGREGAR LIKES
  // ==========================================
  console.log('\n❤️  Adding likes...');

  let likeCount = 0;
  for (const image of images) {
    // Cada imagen recibe likes aleatorios de 2-5 usuarios
    const numLikes = Math.floor(Math.random() * 4) + 2;
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numLikes && i < shuffledUsers.length; i++) {
      try {
        await prisma.imageLike.create({
          data: {
            imageId: image.id,
            userId: shuffledUsers[i].id,
          },
        });
        likeCount++;
      } catch {
        // Ignorar duplicados
      }
    }
  }

  console.log(`   ✅ Added ${likeCount} likes`);

  // ==========================================
  // AGREGAR COMENTARIOS
  // ==========================================
  console.log('\n💬 Adding comments...');

  const commentTexts = [
    '¡Qué bonita foto! 📸',
    'Increíble momento capturado',
    'Me encanta esta imagen',
    '¡Qué recuerdos! 😊',
    'Hermoso 💕',
    'Gran fotografía',
    'Este fue mi momento favorito',
    '¡Qué bien salió!',
    'Recuerdo ese momento perfectamente',
    'Gracias por compartir',
    '¡Épico! 🔥',
    'Muy buena toma',
    'El mejor momento del evento',
    '¡Me encanta!',
    'Qué linda foto',
  ];

  let commentCount = 0;
  for (const image of images) {
    // Cada imagen recibe 1-4 comentarios aleatorios
    const numComments = Math.floor(Math.random() * 4) + 1;
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numComments && i < shuffledUsers.length; i++) {
      const randomComment = commentTexts[Math.floor(Math.random() * commentTexts.length)];
      await prisma.comment.create({
        data: {
          imageId: image.id,
          userId: shuffledUsers[i].id,
          content: randomComment,
          createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Últimos 3 días
        },
      });
      commentCount++;
    }
  }

  console.log(`   ✅ Added ${commentCount} comments`);

  // ==========================================
  // RESUMEN
  // ==========================================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Users: ${users.length}`);
  console.log(`   • Events: ${events.length}`);
  console.log(`   • Participants: ${participantCount}`);
  console.log(`   • Images: ${images.length}`);
  console.log(`   • Likes: ${likeCount}`);
  console.log(`   • Comments: ${commentCount}`);
  console.log('\n🔐 Test credentials:');
  console.log('   Email: admin@eventgallery.com');
  console.log('   Password: password123');
  console.log('\n   (All users have password: password123)');
  console.log('='.repeat(50) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

