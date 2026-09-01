import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** fc_settings — key/value store. No uuid, no soft delete. */
@Entity('fc_settings')
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_setting_key')
  @Column({ name: 'setting_key', type: 'varchar', length: 255, unique: true })
  settingKey: string;

  @Column({ name: 'setting_value', type: 'longtext', nullable: true })
  settingValue: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
