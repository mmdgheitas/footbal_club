import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DataSource, DeepPartial, ObjectLiteral, Repository } from 'typeorm';
import { buildDataSourceOptions, isSqlite } from '../src/database/db-options';
import {
  Attendance,
  Classroom,
  Expense,
  ExpenseCategory,
  GuardianUser,
  MatchType,
  MembershipCard,
  Notification,
  NotificationAudience,
  NotificationType,
  Payment,
  Player,
  PlayerBadge,
  PlayerGuardian,
  PlayerPerformance,
  PlayerScore,
  PreferredFoot,
  RegistrationStatus,
  TrainingSession,
  User,
  UserRole,
} from '../src/database/entities';
import { BADGES, MEMBERSHIP_CARD_PREFIX } from '../src/config/constants';

/**
 * داده نمونه برای نمایش و توسعه.
 *
 * Fills an empty database with one classroom per coach, approved and pending
 * players, guardians linked to them, payments (paid + outstanding), attendance,
 * training sessions, scores, badges, performance records, club expenses and
 * in-panel notifications — enough for every screen of every panel to show real
 * content.
 *
 *   DB_CONNECTION=sqlite npx ts-node scripts/seed-demo.ts
 *
 * Logging in: the single login page asks for a mobile number and sends a code.
 * With SMS_PROVIDER=mock the code is printed in the server log and shown on the
 * verification page, so any of the phone numbers below can sign in.
 */

const PASSWORD = 'Password123!';

/** repo.save(repo.create(x)) with the single-entity overload pinned down. */
async function saveOne<T extends ObjectLiteral>(
  repo: Repository<T>,
  data: DeepPartial<T>,
): Promise<T> {
  const entity = repo.create(data);
  return repo.save(entity as DeepPartial<T> as T);
}

/** MySQL DATETIME literal (the entities keep dates as strings). */
const nowSql = (): string => new Date().toISOString().slice(0, 19).replace('T', ' ');

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const daysAhead = (n: number): string => daysAgo(-n);

async function main(): Promise<void> {
  const ds = new DataSource(buildDataSourceOptions());
  await ds.initialize();

  if (!isSqlite()) {
    // eslint-disable-next-line no-console
    console.log(
      'NOTE: running against MySQL. Tables must already exist ' +
        '(database/schema.sql + database/migrations/*.sql).',
    );
  }

  const hash = await bcrypt.hash(PASSWORD, 12);

  // --- staff -----------------------------------------------------------
  const users = ds.getRepository(User);
  const mkUser = (
    name: string,
    email: string,
    phone: string,
    role: UserRole,
  ): User =>
    users.create({
      uuid: uuidv4(),
      name,
      email,
      phone,
      passwordHash: hash,
      role,
      status: 1,
    });

  const admin = await users.save(
    mkUser('مدیر باشگاه نواب', 'admin@navab.club', '09120000001', UserRole.SUPER_ADMIN) as User,
  );
  const coach = await users.save(
    mkUser('رضا مربی', 'coach@navab.club', '09120000002', UserRole.COACH) as User,
  );
  const coach2 = await users.save(
    mkUser('سعید مربی', 'coach2@navab.club', '09120000003', UserRole.COACH) as User,
  );
  const accountant = await users.save(
    mkUser('نگار حسابدار', 'finance@navab.club', '09120000004', UserRole.ACCOUNTANT) as User,
  );

  // --- classrooms -------------------------------------------------------
  const classrooms = ds.getRepository(Classroom);
  const classA = await saveOne(classrooms, {
      uuid: uuidv4(),
      name: 'کلاس نونهالان الف',
      coachId: coach.id,
      description: 'رده سنی زیر ۱۲ سال — شنبه و دوشنبه ۱۷:۰۰',
  });
  const classB = await saveOne(classrooms, {
      uuid: uuidv4(),
      name: 'کلاس نوجوانان ب',
      coachId: coach2.id,
      description: 'رده سنی زیر ۱۶ سال — یکشنبه و سه‌شنبه ۱۸:۳۰',
  });

  // --- players ----------------------------------------------------------
  const players = ds.getRepository(Player);
  const mkPlayer = (data: Partial<Player>): Player =>
    players.create({
      uuid: uuidv4(),
      status: 1,
      medicalClearance: 1,
      ageCategory: 'u12' as never,
      registrationStatus: RegistrationStatus.APPROVED,
      totalScore: 0,
      ...data,
    } as Player);

  const ali = await players.save(
    mkPlayer({
      classroomId: classA.id,
      name: 'علی رضایی',
      fatherName: 'حسن رضایی',
      dateOfBirth: '2014-04-12',
      nationalId: '0012345671',
      position: 'forward' as never,
      heightCm: 148,
      weightKg: 41,
      preferredFoot: PreferredFoot.RIGHT,
      membershipDate: daysAgo(300),
      phone: '09120000011',
    }),
  );
  const sina = await players.save(
    mkPlayer({
      classroomId: classA.id,
      name: 'سینا رضایی',
      fatherName: 'حسن رضایی',
      dateOfBirth: '2016-09-01',
      nationalId: '0012345672',
      position: 'midfielder' as never,
      heightCm: 132,
      weightKg: 31,
      preferredFoot: PreferredFoot.LEFT,
      membershipDate: daysAgo(120),
      ageCategory: 'u10' as never,
    }),
  );
  const mohammad = await players.save(
    mkPlayer({
      classroomId: classB.id,
      name: 'محمد کریمی',
      fatherName: 'اکبر کریمی',
      dateOfBirth: '2011-01-20',
      nationalId: '0012345673',
      position: 'goalkeeper' as never,
      heightCm: 165,
      weightKg: 55,
      preferredFoot: PreferredFoot.BOTH,
      membershipDate: daysAgo(500),
      ageCategory: 'u16' as never,
    }),
  );
  const pending = await players.save(
    mkPlayer({
      classroomId: classA.id,
      name: 'امیر نوروزی',
      fatherName: 'مجید نوروزی',
      dateOfBirth: '2015-06-05',
      nationalId: '0012345674',
      position: 'defender' as never,
      registrationStatus: RegistrationStatus.PENDING,
      status: 0,
      membershipDate: null,
    }),
  );

  // Player login accounts (phone = login).
  await users.save([
    users.create({
      uuid: uuidv4(),
      name: ali.name,
      email: 'ali@navab.club',
      phone: '09120000011',
      passwordHash: hash,
      role: UserRole.PLAYER,
      playerId: ali.id,
      status: 1,
    }),
    users.create({
      uuid: uuidv4(),
      name: mohammad.name,
      email: 'mohammad@navab.club',
      phone: '09120000012',
      passwordHash: hash,
      role: UserRole.PLAYER,
      playerId: mohammad.id,
      status: 1,
    }),
  ]);

  // --- guardians --------------------------------------------------------
  const guardians = ds.getRepository(GuardianUser);
  const links = ds.getRepository(PlayerGuardian);

  const hasan = await saveOne(guardians, {
    uuid: uuidv4(),
    name: 'حسن رضایی',
    phone: '09120000021',
    nationalId: '0011111111',
    status: 1,
  });
  const akbar = await saveOne(guardians, {
    uuid: uuidv4(),
    name: 'اکبر کریمی',
    phone: '09120000022',
    status: 1,
  });
  await links.save([
    links.create({ guardianId: hasan.id, playerId: ali.id, relationship: 'پدر' }),
    links.create({ guardianId: hasan.id, playerId: sina.id, relationship: 'پدر' }),
    links.create({ guardianId: akbar.id, playerId: mohammad.id, relationship: 'پدر' }),
    links.create({ guardianId: akbar.id, playerId: pending.id, relationship: 'عمو' }),
  ]);

  // --- membership cards --------------------------------------------------
  const cards = ds.getRepository(MembershipCard);
  let seq = 100;
  for (const player of [ali, sina, mohammad]) {
    await saveOne(cards, {
      playerId: player.id,
      cardNumber: `${MEMBERSHIP_CARD_PREFIX}-1404-${String(++seq).padStart(6, '0')}`,
      issuedAt: nowSql(),
      issuedBy: admin.id,
      status: 'active' as never,
    });
  }

  // --- payments (income + outstanding debt) ------------------------------
  const payments = ds.getRepository(Payment);
  const mkPayment = (
    playerId: number,
    amount: string,
    status: string,
    description: string,
  ): DeepPartial<Payment> => ({
    uuid: uuidv4(),
    playerId,
    amount,
    status: status as never,
    paymentMethod: 'cash',
    description,
    referenceNumber: `REF-${Math.floor(Math.random() * 900000 + 100000)}`,
  });

  await payments.save(payments.create([
    mkPayment(ali.id, '2500000', 'completed', 'شهریه فصل پاییز'),
    mkPayment(ali.id, '2500000', 'pending', 'شهریه فصل زمستان'),
    mkPayment(sina.id, '2000000', 'completed', 'شهریه فصل پاییز'),
    mkPayment(mohammad.id, '3000000', 'completed', 'شهریه فصل پاییز'),
    mkPayment(mohammad.id, '3000000', 'pending', 'شهریه فصل زمستان'),
    mkPayment(mohammad.id, '500000', 'failed', 'هزینه لباس تیم'),
  ]));

  // --- attendance --------------------------------------------------------
  const attendance = ds.getRepository(Attendance);
  const rows: Attendance[] = [];
  for (const player of [ali, sina, mohammad]) {
    for (let i = 1; i <= 10; i++) {
      rows.push(
        attendance.create({
          uuid: uuidv4(),
          playerId: player.id,
          sessionDate: daysAgo(i * 3),
          status: i % 5 === 0 ? 2 : i % 7 === 0 ? 4 : 1,
          recordedBy: coach.id,
        }),
      );
    }
  }
  await attendance.save(rows);

  // --- training sessions --------------------------------------------------
  const trainings = ds.getRepository(TrainingSession);
  await trainings.save([
    trainings.create({
      classroomId: classA.id,
      title: 'تمرین تکنیک و پاس',
      sessionDate: daysAhead(2),
      startTime: '17:00',
      location: 'زمین چمن شماره ۱',
      createdBy: coach.id,
    }),
    trainings.create({
      classroomId: classA.id,
      title: 'بازی دوستانه درون‌گروهی',
      sessionDate: daysAhead(6),
      startTime: '17:00',
      location: 'زمین چمن شماره ۱',
      createdBy: coach.id,
    }),
    trainings.create({
      classroomId: classB.id,
      title: 'تمرین قدرتی',
      sessionDate: daysAhead(3),
      startTime: '18:30',
      location: 'سالن بدنسازی',
      createdBy: coach2.id,
    }),
    trainings.create({
      classroomId: classA.id,
      title: 'تمرین شوت‌زنی',
      sessionDate: daysAgo(4),
      startTime: '17:00',
      location: 'زمین چمن شماره ۱',
      createdBy: coach.id,
    }),
  ]);

  // --- performance, scores, badges ---------------------------------------
  const performances = ds.getRepository(PlayerPerformance);
  const scores = ds.getRepository(PlayerScore);
  const badges = ds.getRepository(PlayerBadge);

  await performances.save([
    performances.create({ playerId: ali.id, recordedBy: coach.id, type: 'goal', value: 3, matchType: MatchType.FRIENDLY, sessionDate: daysAgo(6), description: 'هت‌تریک در بازی دوستانه' }),
    performances.create({ playerId: ali.id, recordedBy: coach.id, type: 'assist', value: 2, matchType: MatchType.TRAINING, sessionDate: daysAgo(9) }),
    performances.create({ playerId: ali.id, recordedBy: coach.id, type: 'dribble', value: 7, matchType: MatchType.TRAINING, sessionDate: daysAgo(12) }),
    performances.create({ playerId: ali.id, recordedBy: coach.id, type: 'feedback', value: 1, matchType: MatchType.TRAINING, sessionDate: daysAgo(3), description: 'پیشرفت خیلی خوبی در کنترل توپ داشته؛ روی پای چپ بیشتر کار کند.' }),
    performances.create({ playerId: sina.id, recordedBy: coach.id, type: 'pass_accuracy', value: 12, matchType: MatchType.TRAINING, sessionDate: daysAgo(8) }),
    performances.create({ playerId: sina.id, recordedBy: coach.id, type: 'feedback', value: 1, matchType: MatchType.TRAINING, sessionDate: daysAgo(5), description: 'در تمرین‌ها بسیار منظم است.' }),
    performances.create({ playerId: mohammad.id, recordedBy: coach2.id, type: 'save', value: 9, matchType: MatchType.OFFICIAL, sessionDate: daysAgo(7) }),
    performances.create({ playerId: mohammad.id, recordedBy: coach2.id, type: 'clean_sheet', value: 2, matchType: MatchType.OFFICIAL, sessionDate: daysAgo(7) }),
  ]);

  await scores.save([
    scores.create({ playerId: ali.id, scoredBy: coach.id, points: 15, reason: 'سه گل در بازی دوستانه', sessionDate: daysAgo(6) }),
    scores.create({ playerId: ali.id, scoredBy: coach.id, points: 6, reason: 'دو پاس گل', sessionDate: daysAgo(9) }),
    scores.create({ playerId: ali.id, scoredBy: admin.id, points: 10, reason: 'بازیکن برتر ماه' }),
    scores.create({ playerId: sina.id, scoredBy: coach.id, points: 12, reason: 'دقت پاس', sessionDate: daysAgo(8) }),
    scores.create({ playerId: mohammad.id, scoredBy: coach2.id, points: 27, reason: 'نه سیو و دو کلین‌شیت', sessionDate: daysAgo(7) }),
  ]);

  for (const [playerId, key] of [
    [ali.id, 'top_scorer'],
    [ali.id, 'best_player'],
    [sina.id, 'most_disciplined'],
    [mohammad.id, 'best_goalkeeper'],
  ] as Array<[number, string]>) {
    const badge = BADGES[key] ?? Object.values(BADGES)[0];
    await saveOne(badges, {
      playerId,
      badgeKey: key,
      badgeTitle: badge?.title ?? key,
      assignedBy: admin.id,
      note: 'نمونه',
    });
  }

  // Total score = simple sum of fc_player_scores.
  for (const player of [ali, sina, mohammad]) {
    const row = await scores
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.points), 0)', 'total')
      .where('s.playerId = :id', { id: player.id })
      .getRawOne<{ total: string }>();
    await players.update({ id: player.id }, { totalScore: Number(row?.total ?? 0) });
  }

  // --- club expenses ------------------------------------------------------
  const expenses = ds.getRepository(Expense);
  await expenses.save([
    expenses.create({ title: 'اجاره سالن — مهر', amount: '18000000', category: ExpenseCategory.HALL, expenseDate: daysAgo(40), recordedBy: admin.id }),
    expenses.create({ title: 'نگهداری چمن', amount: '9500000', category: ExpenseCategory.GRASS, expenseDate: daysAgo(25), recordedBy: admin.id }),
    expenses.create({ title: 'اجاره دفتر باشگاه', amount: '12000000', category: ExpenseCategory.OFFICE_RENT, expenseDate: daysAgo(20), recordedBy: admin.id }),
    expenses.create({ title: 'حقوق مربیان', amount: '30000000', category: ExpenseCategory.SALARY, expenseDate: daysAgo(10), recordedBy: admin.id }),
    expenses.create({ title: 'خرید توپ و مخروط تمرین', amount: '4200000', category: ExpenseCategory.EQUIPMENT, expenseDate: daysAgo(5), recordedBy: admin.id }),
  ]);

  // --- in-panel notifications ---------------------------------------------
  const notifications = ds.getRepository(Notification);
  await notifications.save([
    notifications.create({
      userType: NotificationAudience.GUARDIAN,
      userId: hasan.id,
      title: 'یادآوری بدهی',
      message: 'مبلغ ۲٬۵۰۰٬۰۰۰ تومان شهریه علی رضایی پرداخت نشده است.',
      type: NotificationType.DEBT,
      link: '/guardian/financial',
      dedupeKey: `debt:guardian:${hasan.id}`,
    }),
    notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: ali.id,
      title: 'نشان جدید 🏅',
      message: 'نشان «آقای گل» به شما اهدا شد.',
      type: NotificationType.BADGE,
      link: '/app/trophies',
    }),
    notifications.create({
      userType: NotificationAudience.PLAYER,
      userId: ali.id,
      title: 'جلسه تمرین جدید ⚽',
      message: 'تمرین تکنیک و پاس — زمین چمن شماره ۱',
      type: NotificationType.TRAINING,
      link: '/app/trainings',
    }),
    notifications.create({
      userType: NotificationAudience.ADMIN,
      userId: admin.id,
      title: 'ثبت‌نام در انتظار بررسی',
      message: 'پرونده امیر نوروزی منتظر تأیید مدارک است.',
      type: NotificationType.REGISTRATION,
      link: '/admin/registrations',
    }),
    notifications.create({
      userType: NotificationAudience.COACH,
      userId: coach.id,
      title: 'برنامه هفته',
      message: 'دو جلسه تمرین برای کلاس نونهالان الف ثبت شده است.',
      type: NotificationType.TRAINING,
      link: '/coach/trainings',
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log(`
داده نمونه ساخته شد.

ورود با شماره موبایل (کد یک‌بارمصرف در لاگ سرور و صفحه تأیید نمایش داده می‌شود):
  مدیر ارشد   09120000001
  مربی        09120000002
  حسابدار     09120000004
  ولی         09120000021  (علی و سینا)
  ولی         09120000022  (محمد و امیر)
  بازیکن      09120000011  (علی رضایی)
  بازیکن      09120000012  (محمد کریمی)

رمز عبور حساب‌های کارکنان برای ورود جایگزین: ${PASSWORD}
`);

  await ds.destroy();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('SEED FAILED:', error);
  process.exit(1);
});
