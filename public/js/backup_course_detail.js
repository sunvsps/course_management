 <p class="courseStatusText">${statusLabel(enrollment.status)}</p>
      <div class="detailStats">
        <div class="detailStat primary">
          <span class="detailLabel">เหลือ</span>
          <strong>${formatNumber(enrollment.remainingClasses)} ${courseUnit(enrollment.course)}</strong>
        </div>
        <div class="detailSecondaryStats">
          <div class="detailStat compact">
            <span class="detailLabel">ใช้แล้ว</span>
            <strong>${formatNumber(enrollment.purchasedClasses - enrollment.remainingClasses)} ${courseUnit(enrollment.course)}</strong>
          </div>
          <div class="detailStat compact">
            <span class="detailLabel">ทั้งหมด</span>
            <strong>${formatNumber(enrollment.purchasedClasses)} ${courseUnit(enrollment.course)}</strong>
          </div>
        </div>
      </div>