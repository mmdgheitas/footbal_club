<?php
/**
 * Player Panel - Profile/Personal Info View
 */
$player = $player_details ?? [];
$guardians = $player['guardians'] ?? [];
$medical = $player['medical'] ?? null;
$injuries = $player['injuries'] ?? [];
?>

<div style="margin-bottom: 24px;">
    <p style="color: #666; font-size: 15px;">در این بخش می‌توانید پرونده ثبت‌شده خود شامل مشخصات فردی، سرپرستان و پرونده پزشکی را مشاهده کنید.</p>
</div>

<!-- Tab Navigation -->
<div style="display: flex; border-bottom: 2px solid #eee; margin-bottom: 24px; gap: 10px;">
    <button type="button" class="tab-btn active" onclick="switchTab('player-info', this)" style="padding: 12px 20px; font-size: 15px; font-weight: 600; background: none; border: none; border-bottom: 3px solid #3498db; color: #3498db; cursor: pointer; transition: all 0.2s;">👤 مشخصات بازیکن</button>
    <button type="button" class="tab-btn" onclick="switchTab('guardian-info', this)" style="padding: 12px 20px; font-size: 15px; font-weight: 600; background: none; border: none; border-bottom: 3px solid transparent; color: #666; cursor: pointer; transition: all 0.2s;">👥 اطلاعات ولی / سرپرست</button>
    <button type="button" class="tab-btn" onclick="switchTab('medical-info', this)" style="padding: 12px 20px; font-size: 15px; font-weight: 600; background: none; border: none; border-bottom: 3px solid transparent; color: #666; cursor: pointer; transition: all 0.2s;">🏥 پرونده پزشکی و مصدومیت‌ها</button>
</div>

<!-- Tab Content Container -->
<div>
    <!-- Tab 1: Player Info -->
    <div id="player-info" class="tab-content" style="display: block;">
        <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">👤 شناسنامه ورزشی بازیکن</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">نام و نام خانوادگی</span>
                    <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></strong>
                </div>
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">کد ملی</span>
                    <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($player['national_id']) ?></strong>
                </div>
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">تاریخ تولد</span>
                    <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($player['date_of_birth']) ?></strong>
                </div>
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">پست تخصصی</span>
                    <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? $player['position']) ?></strong>
                </div>
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">رده سنی</span>
                    <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? $player['age_category']) ?></strong>
                </div>
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">شماره تماس</span>
                    <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($player['phone'] ?? '-') ?></strong>
                </div>
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">آدرس ایمیل</span>
                    <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($player['email'] ?? '-') ?></strong>
                </div>
                <div style="padding: 10px; background: #faf9f6; border-radius: 6px;">
                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">مجوز پزشکی بازی</span>
                    <strong style="font-size: 15px; color: <?= $player['medical_clearance'] ? '#2ed573' : '#ff4757' ?>;">
                        <?= $player['medical_clearance'] ? 'تایید شده ✅' : 'فاقد تاییدیه ❌' ?>
                    </strong>
                </div>
            </div>

            <?php if (!empty($player['notes'])): ?>
                <div style="margin-top: 20px; padding: 14px; background: #fffbf0; border-radius: 6px; border-right: 3px solid #ffa502;">
                    <span style="font-size: 12px; color: #ffa502; display: block; margin-bottom: 4px; font-weight: 600;">یادداشت مربی / باشگاه</span>
                    <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;"><?= \App\Helpers\SecurityHelper::escape($player['notes']) ?></p>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Tab 2: Guardian Info -->
    <div id="guardian-info" class="tab-content" style="display: none;">
        <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">👥 اطلاعات سرپرستان قانونی</h3>

            <?php if (empty($guardians)): ?>
                <p style="color: #888; text-align: center; padding: 20px 0;">سرپرستی برای شما ثبت نشده است.</p>
            <?php else: ?>
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <?php foreach ($guardians as $g): ?>
                        <div style="padding: 16px; background: #faf9f6; border-radius: 8px; border-right: 3px solid #3498db;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div>
                                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 2px;">نام سرپرست</span>
                                    <strong style="font-size: 14px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($g['name']) ?></strong>
                                </div>
                                <div>
                                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 2px;">نسبت با بازیکن</span>
                                    <strong style="font-size: 14px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($g['relationship'] ?? '-') ?></strong>
                                </div>
                                <div>
                                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 2px;">شماره تماس اضطراری</span>
                                    <strong style="font-size: 14px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($g['phone']) ?></strong>
                                </div>
                                <div>
                                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 2px;">پست الکترونیکی</span>
                                    <strong style="font-size: 14px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($g['email'] ?? '-') ?></strong>
                                </div>
                            </div>
                            <?php if (!empty($g['address'])): ?>
                                <div style="margin-top: 12px; border-top: 1px dashed #ddd; padding-top: 8px;">
                                    <span style="font-size: 12px; color: #888; display: block; margin-bottom: 2px;">نشانی محل سکونت</span>
                                    <span style="font-size: 13px; color: #555;"><?= \App\Helpers\SecurityHelper::escape($g['address']) ?></span>
                                </div>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Tab 3: Medical Info -->
    <div id="medical-info" class="tab-content" style="display: none;">
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <!-- Medical Record File -->
            <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
                <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">🏥 پرونده پزشکی</h3>
                
                <?php if ($medical === null): ?>
                    <p style="color: #888; text-align: center; padding: 20px 0;">پرونده پزشکی برای شما ثبت نشده است.</p>
                <?php else: ?>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 20px;">
                        <div style="padding: 10px; background: #f6f8fe; border-radius: 6px;">
                            <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">گروه خونی</span>
                            <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($medical['blood_type'] ?? '-') ?></strong>
                        </div>
                        <div style="padding: 10px; background: #f6f8fe; border-radius: 6px;">
                            <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">وضعیت واکسیناسیون</span>
                            <strong style="font-size: 15px; color: #2c3e50;"><?= \App\Helpers\SecurityHelper::escape($medical['vaccination_status'] ?? '-') ?></strong>
                        </div>
                        <div style="padding: 10px; background: #f6f8fe; border-radius: 6px;">
                            <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">تاریخ آخرین معاینه پزشکی</span>
                            <strong style="font-size: 15px; color: #2c3e50;"><?= !empty($medical['last_exam_date']) ? \App\Helpers\SecurityHelper::escape($medical['last_exam_date']) : '-' ?></strong>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div style="padding: 14px; background: #fff5f5; border-radius: 6px; border-right: 3px solid #ff4757;">
                            <span style="font-size: 12px; color: #ff4757; display: block; margin-bottom: 4px; font-weight: 600;">حساسیت‌ها (آلرژی)</span>
                            <p style="margin: 0; font-size: 14px; color: #555;"><?= !empty($medical['allergies']) ? \App\Helpers\SecurityHelper::escape($medical['allergies']) : 'موردی ثبت نشده است.' ?></p>
                        </div>
                        <div style="padding: 14px; background: #fdf6ec; border-radius: 6px; border-right: 3px solid #ffa502;">
                            <span style="font-size: 12px; color: #ffa502; display: block; margin-bottom: 4px; font-weight: 600;">بیماری‌های خاص / سوابق خاص</span>
                            <p style="margin: 0; font-size: 14px; color: #555;"><?= !empty($medical['medical_conditions']) ? \App\Helpers\SecurityHelper::escape($medical['medical_conditions']) : 'موردی ثبت نشده است.' ?></p>
                        </div>
                        <?php if (!empty($medical['exam_notes'])): ?>
                            <div style="padding: 14px; background: #faf9f6; border-radius: 6px; border-right: 3px solid #999;">
                                <span style="font-size: 12px; color: #888; display: block; margin-bottom: 4px; font-weight: 600;">توضیحات پزشک</span>
                                <p style="margin: 0; font-size: 14px; color: #555;"><?= \App\Helpers\SecurityHelper::escape($medical['exam_notes']) ?></p>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Injury Records -->
            <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); padding: 24px;">
                <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 12px;">🤕 تاریخچه آسیب‌دیدگی‌ها</h3>

                <?php if (empty($injuries)): ?>
                    <p style="color: #888; text-align: center; padding: 20px 0;">سابقه مصدومیتی برای شما ثبت نشده است.</p>
                <?php else: ?>
                    <div style="overflow-x: auto;">
                        <table class="table" style="width: 100%; border-collapse: collapse; text-align: right;">
                            <thead>
                                <tr style="border-bottom: 2px solid #eee;">
                                    <th style="padding: 12px 8px; font-weight: 600; color: #888;">نوع آسیب</th>
                                    <th style="padding: 12px 8px; font-weight: 600; color: #888;">شدت</th>
                                    <th style="padding: 12px 8px; font-weight: 600; color: #888;">تاریخ مصدومیت</th>
                                    <th style="padding: 12px 8px; font-weight: 600; color: #888;">تاریخ بهبود</th>
                                    <th style="padding: 12px 8px; font-weight: 600; color: #888;">توضیحات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($injuries as $injury): ?>
                                    <tr style="border-bottom: 1px solid #f1f2f6;">
                                        <td style="padding: 12px 8px; font-weight: 600;"><?= \App\Helpers\SecurityHelper::escape($injury['injury_type']) ?></td>
                                        <td style="padding: 12px 8px;">
                                            <?php
                                            $severity = $injury['severity'];
                                            $sevColor = '#ffa502';
                                            $sevText = 'متوسط';
                                            if ($severity === 'minor') {
                                                $sevColor = '#2ed573';
                                                $sevText = 'جزئی';
                                            } elseif ($severity === 'severe') {
                                                $sevColor = '#ff4757';
                                                $sevText = 'شدید';
                                            }
                                            ?>
                                            <span style="color: <?= $sevColor ?>; font-weight: 600;"><?= $sevText ?></span>
                                        </td>
                                        <td style="padding: 12px 8px; font-size: 13px; color: #666;"><?= \App\Helpers\SecurityHelper::escape($injury['date_of_injury']) ?></td>
                                        <td style="padding: 12px 8px; font-size: 13px; color: #2ed573;">
                                            <?= !empty($injury['recovery_date']) ? \App\Helpers\SecurityHelper::escape($injury['recovery_date']) : 'دوران نقاهت ⏳' ?>
                                        </td>
                                        <td style="padding: 12px 8px; font-size: 13px; color: #888;"><?= \App\Helpers\SecurityHelper::escape($injury['notes'] ?? '-') ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<script>
function switchTab(tabId, btn) {
    // Hide all contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.style.display = 'none');
    
    // Deactivate all buttons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(b => {
        b.classList.remove('active');
        b.style.color = '#666';
        b.style.borderBottomColor = 'transparent';
    });
    
    // Show select content
    document.getElementById(tabId).style.display = 'block';
    
    // Activate clicked button
    btn.classList.add('active');
    btn.style.color = '#3498db';
    btn.style.borderBottomColor = '#3498db';
}
</script>
