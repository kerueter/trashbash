export class Filter {
  constructor(
    private radius: number,
    private trash: Array<boolean>,
    private username: string,
    private startDate: string,
    private endDate: string
  ) {}

  public equals(anotherFilter: Filter): boolean {
    return this.hashCode() === anotherFilter.hashCode();
  }

  public hashCode(): number {
    return this.generateHashCode();
  }

  public getRadius(): number {
    return this.radius;
  }

  public setRadius(radius: number) {
    this.radius = Math.max(0, radius);
  }

  public getTrash(): Array<boolean> {
    return this.trash;
  }

  public setTrash(index: number, status: boolean) {
    if (index >= 0 && index < 4) {
      this.trash[index] = status;
    }
  }

  public getUsername(): string {
    return this.username;
  }

  public setUsername(username: string) {
    this.username = username;
  }

  public getStartDate(): string {
    return this.startDate;
  }

  public getEndDate(): string {
    return this.endDate;
  }

  private generateHashCode() {
    let hash = 0, i = 0;
    const hashStr = `${this.radius}:${this.trash.toString()}:${this.username}:${this.startDate.toString()}:${this.endDate.toString()}`;

    if (hashStr.length > 0) {
      while (i < hashStr.length) {
        hash = ((hash << 5) - hash + hashStr.charCodeAt(i++)) | 0;
      }
    }

    return hash;
  }
}
