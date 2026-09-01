import { AGE_CATEGORIES } from '../../config/constants';

/** Port of app/Models/Player.php age helpers. */
export class PlayerHelper {
  /**
   * Player::calculateAge() — full years between the birth date and today,
   * matching PHP DateTime::diff()->y.
   */
  static calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth + 'T00:00:00Z');
    const today = new Date();

    let age = today.getUTCFullYear() - birth.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
      age--;
    }
    return age;
  }

  /**
   * Player::getAgeCategory() — walks AGE_CATEGORIES in declaration order and
   * returns the first range containing the age, defaulting to 'senior'.
   */
  static getAgeCategory(dateOfBirth: string): string {
    const age = PlayerHelper.calculateAge(dateOfBirth);

    for (const [category, range] of Object.entries(AGE_CATEGORIES)) {
      if (age >= range.min && age <= range.max) {
        return category;
      }
    }
    return 'senior';
  }
}
